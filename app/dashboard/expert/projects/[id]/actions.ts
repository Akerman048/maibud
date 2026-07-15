"use server";

import { revalidatePath } from "next/cache";

import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function createComment(formData: FormData) {
  const currentUser = await requireRole([UserRole.EXPERT]);

  const documentId = String(formData.get("documentId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!documentId || !content || !projectId) {
    throw new Error("Заповніть усі поля");
  }

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
      project: {
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!document) {
    throw new Error("Document not found or access denied");
  }

  await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        documentId,
        content,
        authorId: currentUser.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Додано зауваження до документа",
        entityType: "COMMENT",
        entityId: comment.id,
        userId: currentUser.id,
        projectId,
      },
    });
  });

  revalidatePath(`/dashboard/expert/projects/${projectId}`);
  revalidatePath("/dashboard/expert/comments");
  revalidatePath("/dashboard/designer/comments");
}
