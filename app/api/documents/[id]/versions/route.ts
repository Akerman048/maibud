import { NextResponse } from "next/server";

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
}