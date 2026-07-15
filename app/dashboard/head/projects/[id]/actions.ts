"use server";

import { revalidatePath } from "next/cache";

import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

async function getDocumentForPublication(documentId: string) {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  return document;
}

function revalidateDocumentPublication(projectId: string) {
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath(`/dashboard/archivist/projects/${projectId}`);
  revalidatePath(`/dashboard/client/projects/${projectId}`);
}

export async function publishDocumentToClient(documentId: string) {
  const currentUser = await requireRole([
    UserRole.HEAD,
    UserRole.ARCHIVIST,
  ]);
  const document = await getDocumentForPublication(documentId);

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: {
        id: document.id,
      },
      data: {
        isPublishedToClient: true,
        publishedAt: new Date(),
        publishedById: currentUser.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Документ опубліковано для клієнта",
        entityType: "DOCUMENT",
        entityId: document.id,
        userId: currentUser.id,
        projectId: document.projectId,
      },
    });
  });

  revalidateDocumentPublication(document.projectId);
}

export async function unpublishDocumentFromClient(
  documentId: string,
) {
  const currentUser = await requireRole([
    UserRole.HEAD,
    UserRole.ARCHIVIST,
  ]);
  const document = await getDocumentForPublication(documentId);

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: {
        id: document.id,
      },
      data: {
        isPublishedToClient: false,
        publishedAt: null,
        publishedById: null,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Публікацію документа для клієнта скасовано",
        entityType: "DOCUMENT",
        entityId: document.id,
        userId: currentUser.id,
        projectId: document.projectId,
      },
    });
  });

  revalidateDocumentPublication(document.projectId);
}
