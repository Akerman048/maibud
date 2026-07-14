"use server";

import { revalidatePath } from "next/cache";

import {
  CommentStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function returnComment(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();

  if (!commentId) {
    throw new Error("Comment id is required");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    include: {
      document: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
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
    await tx.comment.update({
      where: {
        id: commentId,
      },
      data: {
        status: CommentStatus.RETURNED,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Зауваження повернено на доопрацювання",
        entityType: "COMMENT",
        entityId: commentId,
        userId: expert.id,
        projectId: comment.document.projectId,
      },
    });
  });

  const projectId = comment.document.projectId;

  revalidatePath(`/dashboard/expert/projects/${projectId}`);
  revalidatePath(`/dashboard/designer/projects/${projectId}`);
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath(`/dashboard/archivist/projects/${projectId}`);
  revalidatePath(`/project/${projectId}`);
  revalidatePath("/dashboard/expert/comments");
  revalidatePath("/dashboard/designer/comments");
}