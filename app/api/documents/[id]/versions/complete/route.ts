import {
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  NotificationType,
  Prisma,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { getAuthorizationErrorResponse } from "@/lib/api-error";
import { withApiObservability } from "@/lib/api-observability";
import { normalizeError } from "@/lib/error-normalization";
import { logger } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { requireRole } from "@/lib/auth-guard";
import {
  canUploadDocumentVersion,
  DocumentWorkflowError,
  getNewVersionTransition,
} from "@/lib/document-workflow";
import { prisma } from "@/lib/prisma";
import { getNotificationHref } from "@/lib/notification-policy";
import { getExpertMemberUserIds } from "@/lib/notification-recipients";
import { createNotifications } from "@/lib/notifications";
import { s3 } from "@/lib/s3";

import type {
  CompleteDocumentVersionUploadRequest,
  CompleteDocumentVersionUploadResponse,
} from "@/types/upload";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "application/acad",
  "application/x-acad",
  "application/autocad_dwg",
]);

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024;

class DocumentWorkflowConflictError extends Error {}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeContentType(contentType: string | undefined) {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isExpectedObjectKey({
  objectKey,
  organizationId,
  projectId,
  documentId,
}: {
  objectKey: string;
  organizationId: string;
  projectId: string;
  documentId: string;
}) {
  const expectedPrefix = [
    "organizations",
    organizationId,
    "projects",
    projectId,
    "documents",
    documentId,
    "pending",
    "",
  ].join("/");

  return (
    objectKey.startsWith(expectedPrefix) &&
    !objectKey.includes("..") &&
    !objectKey.includes("\\")
  );
}

async function completeVersionUpload(
  request: Request,
  context: RouteContext,
) {
  try {
    const currentUser = await requireRole([UserRole.DESIGNER]);

    const { id: documentId } = await context.params;

    let body: CompleteDocumentVersionUploadRequest;

    try {
      body =
        (await request.json()) as CompleteDocumentVersionUploadRequest;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        {
          status: 400,
        },
      );
    }

    const objectKey = body.objectKey?.trim();
    const fileName = body.fileName?.trim();
    const mimeType = normalizeContentType(body.mimeType);
    const fileSize = Number(body.fileSize);
    const checksum = body.checksum?.trim() || undefined;

    if (
      !documentId ||
      !objectKey ||
      !fileName ||
      !mimeType ||
      !Number.isSafeInteger(fileSize)
    ) {
      return NextResponse.json(
        {
          error: "Invalid version metadata",
        },
        {
          status: 400,
        },
      );
    }

    const maxFileSize =
      Number(process.env.MAX_DOCUMENT_FILE_SIZE) ||
      DEFAULT_MAX_FILE_SIZE;

    if (fileSize <= 0 || fileSize > maxFileSize) {
      return NextResponse.json(
        {
          error: "Invalid file size",
        },
        {
          status: 413,
        },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: "Unsupported file type",
        },
        {
          status: 415,
        },
      );
    }

    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new Error("AWS_S3_BUCKET is not configured");
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        project: {
          members: {
            some: {
              userId: currentUser.id,
              role: UserRole.DESIGNER,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        project: {
          select: {
            organizationId: true,
            status: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        {
          error: "Document not found or access denied",
        },
        {
          status: 404,
        },
      );
    }

    if (document.project.status === ProjectStatus.ARCHIVED) {
      return NextResponse.json(
        { error: "Archived projects are read-only" },
        { status: 409 },
      );
    }

    if (!canUploadDocumentVersion(document.status)) {
      return NextResponse.json(
        {
          error: "Archived documents cannot be changed",
        },
        {
          status: 409,
        },
      );
    }

    if (
      !isExpectedObjectKey({
        objectKey,
        organizationId: document.project.organizationId,
        projectId: document.projectId,
        documentId: document.id,
      })
    ) {
      return NextResponse.json(
        {
          error: "Object key does not belong to this document",
        },
        {
          status: 403,
        },
      );
    }

    const existingVersion = await prisma.documentVersion.findUnique({
      where: {
        objectKey,
      },
      select: {
        id: true,
      },
    });

    if (existingVersion) {
      return NextResponse.json(
        {
          error: "Upload has already been completed",
        },
        {
          status: 409,
        },
      );
    }

    let uploadedObject;

    try {
      uploadedObject = await s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        (error.$metadata.httpStatusCode === 404 ||
          error.name === "NotFound" ||
          error.name === "NoSuchKey")
      ) {
        return NextResponse.json(
          {
            error: "Uploaded object was not found",
          },
          {
            status: 404,
          },
        );
      }

      logger.error("S3 version HeadObject failed", { error: normalizeError(error) });

      return NextResponse.json(
        {
          error: "Could not verify uploaded object",
        },
        {
          status: 502,
        },
      );
    }

    const actualFileSize = uploadedObject.ContentLength;
    const actualMimeType = normalizeContentType(
      uploadedObject.ContentType,
    );

    if (
      typeof actualFileSize !== "number" ||
      actualFileSize !== fileSize
    ) {
      return NextResponse.json(
        {
          error: "Uploaded file size does not match",
        },
        {
          status: 409,
        },
      );
    }

    if (actualFileSize <= 0 || actualFileSize > maxFileSize) {
      return NextResponse.json(
        {
          error: "Uploaded file size is not allowed",
        },
        {
          status: 413,
        },
      );
    }

    if (actualMimeType !== mimeType) {
      return NextResponse.json(
        {
          error: "Uploaded content type does not match",
        },
        {
          status: 409,
        },
      );
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const projectGuard = await tx.project.updateMany({
            where: {
              id: document.projectId,
              status: { not: ProjectStatus.ARCHIVED },
              members: {
                some: {
                  userId: currentUser.id,
                  role: UserRole.DESIGNER,
                },
              },
            },
            data: { updatedAt: new Date() },
          });

          if (projectGuard.count !== 1) {
            throw new DocumentWorkflowConflictError(
              "Project was archived or access was revoked",
            );
          }

          const currentDocument = await tx.document.findFirst({
            where: {
              id: documentId,
              project: {
                status: { not: ProjectStatus.ARCHIVED },
                members: {
                  some: {
                    userId: currentUser.id,
                    role: UserRole.DESIGNER,
                  },
                },
              },
            },
            select: {
              status: true,
              isPublishedToClient: true,
              project: { select: { status: true } },
            },
          });

          if (!currentDocument) {
            throw new DocumentWorkflowConflictError(
              "Document no longer exists",
            );
          }

          const latestVersion =
            await tx.documentVersion.findFirst({
              where: {
                documentId,
              },
              orderBy: {
                version: "desc",
              },
              select: {
                version: true,
              },
            });

          const nextVersion =
            (latestVersion?.version ?? 0) + 1;
          const transition = getNewVersionTransition({
            status: currentDocument.status,
            projectStatus: currentDocument.project.status,
            isPublishedToClient:
              currentDocument.isPublishedToClient,
            nextVersion,
          });

          const documentGuard = await tx.document.updateMany({
            where: {
              id: documentId,
              status: currentDocument.status,
              project: {
                status: { not: ProjectStatus.ARCHIVED },
                members: {
                  some: {
                    userId: currentUser.id,
                    role: UserRole.DESIGNER,
                  },
                },
              },
            },
            data: {
              status: transition.nextStatus,
              ...(transition.clearReview
                ? {
                    reviewedAt: null,
                    reviewedById: null,
                    rejectionReason: null,
                  }
                : {}),
              ...(transition.clearPublication
                ? {
                    isPublishedToClient: false,
                    publishedAt: null,
                    publishedById: null,
                  }
                : {}),
            },
          });

          if (documentGuard.count !== 1) {
            throw new DocumentWorkflowConflictError(
              "Document or project state changed during upload",
            );
          }

          const version = await tx.documentVersion.create({
            data: {
              version: nextVersion,
              objectKey,
              fileName,
              mimeType,
              fileSize: actualFileSize,
              checksum,
              documentId,
              createdById: currentUser.id,
            },
          });

          await tx.auditLog.create({
            data: {
              action: transition.auditAction,
              entityType: "DOCUMENT",
              entityId: documentId,
              userId: currentUser.id,
              projectId: document.projectId,
            },
          });

          const expertUserIds = await getExpertMemberUserIds(
            tx,
            document.projectId,
          );
          const resubmissionNote =
            currentDocument.status === "REJECTED" ||
            currentDocument.status === "APPROVED"
              ? " Документ повторно подано на перевірку."
              : "";
          await createNotifications(
            tx,
            expertUserIds.map((userId) => ({
              userId,
              actorId: currentUser.id,
              type: NotificationType.DOCUMENT_VERSION_UPLOADED,
              title: "Завантажено нову версію документа",
              message: `Дизайнер завантажив версію v${version.version} документа «${document.title}».${resubmissionNote}`,
              href: getNotificationHref({
                destination: "PROJECT",
                role: UserRole.EXPERT,
                projectId: document.projectId,
              }),
              projectId: document.projectId,
              documentId,
            })),
          );

          const response: CompleteDocumentVersionUploadResponse = {
            documentId,
            versionId: version.id,
            version: version.version,
          };

          return response;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return NextResponse.json(result, {
        status: 201,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        return NextResponse.json(
          {
            error:
              "Version conflict. Another version may have been uploaded simultaneously.",
          },
          {
            status: 409,
          },
        );
      }

      if (
        error instanceof DocumentWorkflowConflictError ||
        error instanceof DocumentWorkflowError
      ) {
        return NextResponse.json(
          {
            error: error.message,
          },
          {
            status: 409,
          },
        );
      }

      throw error;
    }
  } catch (error) {
    const authorizationResponse =
      getAuthorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    metrics.uploadCompletionFailure();
    logger.error("Complete document version upload failed", {
      error: normalizeError(error),
    });

    return NextResponse.json(
      {
        error: "Could not save document version",
      },
      {
        status: 500,
      },
    );
  }
}

export const POST = withApiObservability(
  "/api/documents/[id]/versions/complete",
  completeVersionUpload,
);
