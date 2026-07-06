import type { CommentItem } from "@/types/comment";
import { prisma } from "@/lib/prisma";

export async function getComments(): Promise<CommentItem[]> {
  const comments = await prisma.comment.findMany({
    include: {
      document: {
        include: {
          project: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    documentTitle: comment.document.title,
    projectName: comment.document.project.name,
    section: "Документація",
    text: comment.content,
    status: "open",
  }));
}

export async function getCommentsByProjectId(
  projectId: string,
): Promise<CommentItem[]> {
  const comments = await prisma.comment.findMany({
    where: {
      document: {
        projectId,
      },
    },
    include: {
      document: {
        include: {
          project: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    documentTitle: comment.document.title,
    projectName: comment.document.project.name,
    section: "Документація",
    text: comment.content,
    status: "open",
  }));
}