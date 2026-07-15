import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { UserRole } from "@/app/generated/prisma/client";
import { getAuthorizationErrorResponse } from "@/lib/api-error";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

const DOWNLOAD_URL_EXPIRES_IN = 5 * 60;

type RouteContext = {
  params: Promise<{
    id: string;
    versionId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requireRole([
      UserRole.HEAD,
      UserRole.EXPERT,
      UserRole.DESIGNER,
      UserRole.ARCHIVIST,
    ]);

    const { id: documentId, versionId } = await context.params;

    const version = await prisma.documentVersion.findFirst({
      where: {
        id: versionId,
        documentId,
      },
      select: {
        objectKey: true,
        fileName: true,
        mimeType: true,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: "Document version not found" },
        { status: 404 },
      );
    }

    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new Error("AWS_S3_BUCKET is not configured");
    }

    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: version.objectKey,
        ResponseContentType: version.mimeType,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(
          version.fileName,
        )}`,
      }),
      {
        expiresIn: DOWNLOAD_URL_EXPIRES_IN,
      },
    );

    return NextResponse.json({
      downloadUrl,
      expiresIn: DOWNLOAD_URL_EXPIRES_IN,
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Get document download URL failed", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
