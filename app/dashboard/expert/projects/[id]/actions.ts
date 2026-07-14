"use server";

import { revalidatePath } from "next/cache";

import { UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createComment(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!documentId || !content || !projectId) {
    throw new Error("Заповніть усі поля");
  }

  const expert = await prisma.user.findFirst({
    where: {
      role: UserRole.EXPERT,
    },
  });

  if (!expert) {
    throw new Error("Expert not found");
  }

  await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        documentId,
        content,
        authorId: expert.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Додано зауваження до документа",
        entityType: "COMMENT",
        entityId: comment.id,
        userId: expert.id,
        projectId,
      },
    });
  });

  revalidatePath(`/dashboard/expert/projects/${projectId}`);
  revalidatePath("/dashboard/expert/comments");
  revalidatePath("/dashboard/designer/comments");
}
