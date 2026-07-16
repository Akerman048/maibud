import { randomUUID } from "node:crypto";
import path from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { ProjectStatus, UserRole } from "@/app/generated/prisma/client";
import { getAuthorizationErrorResponse } from "@/lib/api-error";
import { requireRole } from "@/lib/auth-guard";
import { canUploadDocumentVersion } from "@/lib/document-workflow";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

import type {
  PresignDocumentVersionUploadRequest,
  PresignDocumentVersionUploadResponse,
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
const PRESIGNED_URL_EXPIRES_IN = 5 * 60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeContentType(contentType: string | undefined) {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  const baseName = path
    .basename(fileName, extension)
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

  return `${baseName || "document"}${extension}`;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const currentUser = await requireRole([UserRole.DESIGNER]);

    const { id: documentId } = await context.params;

    let body: PresignDocumentVersionUploadRequest;

    try {
      body =
        (await request.json()) as PresignDocumentVersionUploadRequest;
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

    const fileName = body.fileName?.trim();
    const mimeType = normalizeContentType(body.mimeType);
    const fileSize = Number(body.fileSize);

    if (
      !documentId ||
      !fileName ||
      !mimeType ||
      !Number.isSafeInteger(fileSize)
    ) {
      return NextResponse.json(
        {
          error: "Invalid upload metadata",
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
        status: true,
        project: {
          select: {
            id: true,
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

    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new Error("AWS_S3_BUCKET is not configured");
    }

    const safeFileName = sanitizeFileName(fileName);

    const objectKey = [
      "organizations",
      document.project.organizationId,
      "projects",
      document.project.id,
      "documents",
      document.id,
      "pending",
      randomUUID(),
      safeFileName,
    ].join("/");

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: mimeType,
      }),
      {
        expiresIn: PRESIGNED_URL_EXPIRES_IN,
      },
    );

    const response: PresignDocumentVersionUploadResponse = {
      uploadUrl,
      objectKey,
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    };

    return NextResponse.json(response);
  } catch (error) {
    const authorizationResponse =
      getAuthorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Create document version presigned URL failed",
      error,
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
