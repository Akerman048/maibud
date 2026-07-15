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
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const currentUser = await requireRole([UserRole.CLIENT]);
    const { id: documentId } = await context.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        isPublishedToClient: true,
        status: "APPROVED",
        project: {
          members: {
            some: {
              userId: currentUser.id,
              role: UserRole.CLIENT,
            },
          },
        },
      },
      select: {
        versions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
          select: {
            objectKey: true,
            fileName: true,
            mimeType: true,
          },
        },
      },
    });

    const latestVersion = document?.versions[0];

    if (!latestVersion) {
      return NextResponse.json(
        { error: "Published document was not found" },
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
        Key: latestVersion.objectKey,
        ResponseContentType: latestVersion.mimeType,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(
          latestVersion.fileName,
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

    console.error("Get client document download URL failed", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
