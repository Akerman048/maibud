import { NextResponse } from "next/server";

import { UserRole } from "@/app/generated/prisma/client";
import { getAuthorizationErrorResponse } from "@/lib/api-error";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import type { DocumentVersionItem } from "@/types/document";

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
    await requireRole([
      UserRole.HEAD,
      UserRole.EXPERT,
      UserRole.DESIGNER,
      UserRole.ARCHIVIST,
    ]);

    const { id: documentId } = await context.params;

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
      },
      select: {
        id: true,
        versions: {
          orderBy: {
            version: "desc",
          },
          select: {
            id: true,
            version: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
            createdBy: {
              select: {
                name: true,
              },
            },
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

    const versions: DocumentVersionItem[] = document.versions.map(
      (version) => ({
        id: version.id,
        version: version.version,
        fileName: version.fileName,
        mimeType: version.mimeType,
        fileSize: version.fileSize,
        uploadedBy: version.createdBy.name,
        createdAt: version.createdAt.toLocaleString("uk-UA"),
      }),
    );

    return NextResponse.json({
      documentId,
      versions,
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Get document versions failed", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
