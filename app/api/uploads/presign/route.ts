import { randomUUID } from "node:crypto";
import path from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import type {
  PresignDocumentUploadRequest,
  PresignDocumentUploadResponse,
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

export async function POST(request: Request) {
  let body: PresignDocumentUploadRequest;

  try {
    body = (await request.json()) as PresignDocumentUploadRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const projectId = body.projectId?.trim();
  const fileName = body.fileName?.trim();
  const mimeType = body.mimeType?.trim();
  const fileSize = Number(body.fileSize);

  if (!projectId || !fileName || !mimeType || !Number.isFinite(fileSize)) {
    return NextResponse.json(
      { error: "Invalid upload metadata" },
      { status: 400 },
    );
  }

  const maxFileSize =
    Number(process.env.MAX_DOCUMENT_FILE_SIZE) || DEFAULT_MAX_FILE_SIZE;

  if (fileSize <= 0 || fileSize > maxFileSize) {
    return NextResponse.json(
      { error: `File must be smaller than ${maxFileSize} bytes` },
      { status: 413 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 },
    );
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 },
    );
  }

  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  const safeFileName = sanitizeFileName(fileName);

  const objectKey = [
    "organizations",
    project.organizationId,
    "projects",
    project.id,
    "pending",
    randomUUID(),
    safeFileName,
  ].join("/");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
  });

  const response: PresignDocumentUploadResponse = {
    uploadUrl,
    objectKey,
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
  };

  return NextResponse.json(response);
}