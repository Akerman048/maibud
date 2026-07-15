import {
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  DocumentStatus,
  NotificationType,
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import { getAuthorizationErrorResponse } from "@/lib/api-error";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getNotificationHref } from "@/lib/notification-policy";
import { getExpertMemberUserIds } from "@/lib/notification-recipients";
import { createNotifications } from "@/lib/notifications";
import { s3 } from "@/lib/s3";

import type { CompleteDocumentUploadRequest } from "@/types/upload";

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

function normalizeContentType(contentType: string | undefined) {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isExpectedObjectKey({
  objectKey,
  organizationId,
  projectId,
}: {
  objectKey: string;
  organizationId: string;
  projectId: string;
}) {
  const expectedPrefix =
    `organizations/${organizationId}/projects/${projectId}/pending/`;

  return (
    objectKey.startsWith(expectedPrefix) &&
    !objectKey.includes("..") &&
    !objectKey.includes("\\")
  );
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireRole([UserRole.DESIGNER]);

    let body: CompleteDocumentUploadRequest;

    try {
      body = (await request.json()) as CompleteDocumentUploadRequest;
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

    const projectId = body.projectId?.trim();
    const title = body.title?.trim();
    const objectKey = body.objectKey?.trim();
    const fileName = body.fileName?.trim();
    const mimeType = normalizeContentType(body.mimeType);
    const fileSize = Number(body.fileSize);
    const checksum = body.checksum?.trim() || undefined;

    if (
      !projectId ||
      !title ||
      !objectKey ||
      !fileName ||
      !mimeType ||
      !Number.isSafeInteger(fileSize)
    ) {
      return NextResponse.json(
        {
          error: "Invalid document metadata",
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

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId: currentUser.id,
            role: UserRole.DESIGNER,
          },
        },
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          error: "Project not found or access denied",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !isExpectedObjectKey({
        objectKey,
        organizationId: project.organizationId,
        projectId: project.id,
      })
    ) {
      return NextResponse.json(
        {
          error: "Object key does not belong to this project",
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

      console.error("S3 HeadObject failed", error);

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
          error:
            "Uploaded file size does not match declared file size",
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
          error:
            "Uploaded content type does not match declared content type",
        },
        {
          status: 409,
        },
      );
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const document = await tx.document.create({
          data: {
            title,
            status: DocumentStatus.SUBMITTED,
            projectId,
            authorId: currentUser.id,
          },
        });

        const version = await tx.documentVersion.create({
          data: {
            version: 1,
            objectKey,
            fileName,
            mimeType,
            fileSize: actualFileSize,
            checksum,
            documentId: document.id,
            createdById: currentUser.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "Документ подано на перевірку",
            entityType: "DOCUMENT",
            entityId: document.id,
            userId: currentUser.id,
            projectId,
          },
        });

        const expertUserIds = await getExpertMemberUserIds(tx, projectId);
        await createNotifications(
          tx,
          expertUserIds.map((userId) => ({
            userId,
            actorId: currentUser.id,
            type: NotificationType.DOCUMENT_SUBMITTED,
            title: "Новий документ на перевірку",
            message: `Дизайнер подав документ «${document.title}» на перевірку.`,
            href: getNotificationHref({
              destination: "PROJECT",
              role: UserRole.EXPERT,
              projectId,
            }),
            projectId,
            documentId: document.id,
          })),
        );

        return {
          documentId: document.id,
          versionId: version.id,
          version: version.version,
        };
      });

      return NextResponse.json(result, {
        status: 201,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          {
            error: "Upload has already been completed",
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

    console.error("Complete document upload failed", error);

    return NextResponse.json(
      {
        error: "Could not save document metadata",
      },
      {
        status: 500,
      },
    );
  }
}
