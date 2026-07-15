"use server";

import { revalidatePath } from "next/cache";

import {
  CommentStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function resolveComment(formData: FormData) {
  const currentUser = await requireRole([UserRole.DESIGNER]);

  const commentId = String(formData.get("commentId") ?? "").trim();

  if (!commentId) {
    throw new Error("Comment id is required");
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      document: {
        project: {
          members: {
            some: {
              userId: currentUser.id,
            },
          },
        },
      },
    },
    include: {
      document: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found or access denied");
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: {
        id: commentId,
      },
      data: {
        status: CommentStatus.RESOLVED,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "Зауваження позначено виконаним",
        entityType: "COMMENT",
        entityId: commentId,
        userId: currentUser.id,
        projectId: comment.document.projectId,
      },
    });
  });

  const projectId = comment.document.projectId;

  revalidatePath(`/dashboard/designer/projects/${projectId}`);
  revalidatePath(`/dashboard/expert/projects/${projectId}`);
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath(`/dashboard/archivist/projects/${projectId}`);
  revalidatePath(`/project/${projectId}`);
  revalidatePath("/dashboard/designer/comments");
  revalidatePath("/dashboard/expert/comments");
}
