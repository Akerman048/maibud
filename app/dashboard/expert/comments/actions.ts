"use server";

import { revalidatePath } from "next/cache";

import {
  CommentStatus,
  DocumentStatus,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function returnComment(formData: FormData) {
  const currentUser = await requireRole([UserRole.EXPERT]);

  const commentId = String(formData.get("commentId") ?? "").trim();

  if (!commentId) {
    throw new Error("Comment id is required");
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      document: {
        status: { not: DocumentStatus.ARCHIVED },
        project: {
          status: { not: ProjectStatus.ARCHIVED },
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
    const result = await tx.comment.updateMany({
      where: {
        id: commentId,
        document: {
          status: { not: DocumentStatus.ARCHIVED },
          project: {
            status: { not: ProjectStatus.ARCHIVED },
            members: {
              some: { userId: currentUser.id, role: UserRole.EXPERT },
            },
          },
        },
      },
      data: {
        status: CommentStatus.RETURNED,
      },
    });
    if (result.count !== 1) {
      throw new Error("Archived projects and documents are read-only");
    }

    await tx.auditLog.create({
      data: {
        action: "Зауваження повернено на доопрацювання",
        entityType: "COMMENT",
        entityId: commentId,
        userId: currentUser.id,
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
