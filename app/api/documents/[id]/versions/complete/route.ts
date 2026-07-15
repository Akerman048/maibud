import {
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

export async function POST(request: Request, context: RouteContext) {
  const { id: documentId } = await context.params;

  let body: CompleteDocumentVersionUploadRequest;

  try {
    body = (await request.json()) as CompleteDocumentVersionUploadRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
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
      { error: "Invalid version metadata" },
      { status: 400 },
    );
  }

  const maxFileSize =
    Number(process.env.MAX_DOCUMENT_FILE_SIZE) || DEFAULT_MAX_FILE_SIZE;

  if (fileSize <= 0 || fileSize > maxFileSize) {
    return NextResponse.json(
      { error: "Invalid file size" },
      { status: 413 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 },
    );
  }

  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
    select: {
      id: true,
      projectId: true,
      project: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
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
      { error: "Object key does not belong to this document" },
      { status: 403 },
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
      { error: "Upload has already been completed" },
      { status: 409 },
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
        { error: "Uploaded object was not found" },
        { status: 404 },
      );
    }

    console.error("S3 version HeadObject failed", error);

    return NextResponse.json(
      { error: "Could not verify uploaded object" },
      { status: 502 },
    );
  }

  const actualFileSize = uploadedObject.ContentLength;
  const actualMimeType = normalizeContentType(uploadedObject.ContentType);

  if (
    typeof actualFileSize !== "number" ||
    actualFileSize !== fileSize
  ) {
    return NextResponse.json(
      { error: "Uploaded file size does not match" },
      { status: 409 },
    );
  }

  if (actualMimeType !== mimeType) {
    return NextResponse.json(
      { error: "Uploaded content type does not match" },
      { status: 409 },
    );
  }

  const designer = await prisma.user.findFirst({
    where: {
      role: UserRole.DESIGNER,
    },
    select: {
      id: true,
    },
  });

  if (!designer) {
    return NextResponse.json(
      { error: "Designer not found" },
      { status: 404 },
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const latestVersion = await tx.documentVersion.findFirst({
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

        const nextVersion = (latestVersion?.version ?? 0) + 1;

        const version = await tx.documentVersion.create({
          data: {
            version: nextVersion,
            objectKey,
            fileName,
            mimeType,
            fileSize: actualFileSize,
            checksum,
            documentId,
            createdById: designer.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: `Завантажено версію v${nextVersion} документа`,
            entityType: "DOCUMENT",
            entityId: documentId,
            userId: designer.id,
            projectId: document.projectId,
          },
        });

        const response: CompleteDocumentVersionUploadResponse = {
          documentId,
          versionId: version.id,
          version: version.version,
        };

        return response;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Version conflict. Another version may have been uploaded simultaneously.",
        },
        { status: 409 },
      );
    }

    console.error("Complete document version upload failed", error);

    return NextResponse.json(
      { error: "Could not save document version" },
      { status: 500 },
    );
  }
}