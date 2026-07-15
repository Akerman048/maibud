import type { AuditLogItem } from "@/types/audit";
import { prisma } from "@/lib/prisma";

type CreateAuditLogInput = {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  projectId?: string;
};

export async function createAuditLog({
  action,
  entityType,
  entityId,
  userId,
  projectId,
}: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      projectId,
    },
  });
}

export async function getProjectAuditLogs(
  projectId: string,
): Promise<AuditLogItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      projectId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Promise.all(
    logs.map(async (log): Promise<AuditLogItem> => {
      let documentTitle: string | null = null;
      let commentText: string | null = null;

      if (log.entityType === "DOCUMENT") {
        const document = await prisma.document.findUnique({
          where: {
            id: log.entityId,
          },
          select: {
            title: true,
          },
        });

        documentTitle = document?.title ?? null;
      }

      if (log.entityType === "COMMENT") {
        const comment = await prisma.comment.findUnique({
          where: {
            id: log.entityId,
          },
          select: {
            content: true,
            document: {
              select: {
                title: true,
              },
            },
          },
        });

        commentText = comment?.content ?? null;
        documentTitle = comment?.document.title ?? null;
      }

      if (log.entityType === "COMMENT_THREAD") {
        const thread = await prisma.commentThread.findUnique({
          where: { id: log.entityId },
          select: {
            title: true,
            document: { select: { title: true } },
          },
        });

        commentText = thread?.title ?? null;
        documentTitle = thread?.document.title ?? null;
      }

      if (log.entityType === "COMMENT_MESSAGE") {
        const message = await prisma.commentMessage.findUnique({
          where: { id: log.entityId },
          select: {
            deletedAt: true,
            content: true,
            thread: {
              select: {
                document: { select: { title: true } },
              },
            },
          },
        });

        commentText = message?.deletedAt ? null : message?.content ?? null;
        documentTitle = message?.thread.document.title ?? null;
      }

      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        createdAt: log.createdAt.toLocaleString("uk-UA"),
        userName: log.user?.name ?? null,
        documentTitle,
        commentText,
      };
    }),
  );
}
