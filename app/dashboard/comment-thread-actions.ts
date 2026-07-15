"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CommentThreadStatus,
  DocumentStatus,
  NotificationType,
  UserRole,
} from "@/app/generated/prisma/client";
import {
  AuthorizationError,
  requireRole,
} from "@/lib/auth-guard";
import {
  canDeleteCommentMessage,
  canMarkCommentThreadResolved,
  canReplyToCommentThread,
  canReturnCommentThread,
} from "@/lib/comment-thread-policy";
import { getNotificationHref } from "@/lib/notification-policy";
import {
  getDesignerMemberUserIds,
  getProjectMembers,
} from "@/lib/notification-recipients";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { CommentThreadActionState } from "@/types/comment-thread";

class CommentThreadActionError extends Error {}

const idSchema = z.string().trim().min(1, "Не вказано ідентифікатор.");
const contentSchema = z
  .string()
  .trim()
  .min(2, "Повідомлення має містити щонайменше 2 символи.")
  .max(5000, "Повідомлення не може перевищувати 5000 символів.");
const optionalLabelSchema = z
  .string()
  .trim()
  .max(200, "Поле не може перевищувати 200 символів.")
  .transform((value) => value || null);

const createThreadSchema = z.object({
  projectId: idSchema,
  documentId: idSchema,
  documentVersionId: z
    .string()
    .trim()
    .transform((value) => value || null),
  title: optionalLabelSchema,
  section: optionalLabelSchema,
  content: contentSchema,
});

const replySchema = z.object({
  threadId: idSchema,
  content: contentSchema,
});

const transitionSchema = z.object({
  threadId: idSchema,
});

const returnSchema = transitionSchema.extend({
  reason: z
    .string()
    .trim()
    .max(5000, "Причина не може перевищувати 5000 символів.")
    .refine(
      (value) => value.length === 0 || value.length >= 2,
      "Причина має містити щонайменше 2 символи.",
    )
    .transform((value) => value || null),
});

const deleteMessageSchema = z.object({
  messageId: idSchema,
});

function parseForm<T>(result: z.ZodSafeParseResult<T>) {
  if (!result.success) {
    throw new CommentThreadActionError(
      result.error.issues[0]?.message ?? "Некоректні дані форми.",
    );
  }

  return result.data;
}

function getActionState(error: unknown): CommentThreadActionState {
  if (error instanceof CommentThreadActionError) {
    return { error: error.message, success: false };
  }

  if (error instanceof AuthorizationError) {
    return {
      error:
        error.status === 401
          ? "Увійдіть у систему, щоб виконати дію."
          : "Недостатньо прав для цієї дії.",
      success: false,
    };
  }

  console.error("Comment thread action failed", error);

  return {
    error: "Не вдалося виконати дію із зауваженням.",
    success: false,
  };
}

function revalidateCommentThreads(projectId: string, threadId?: string) {
  const paths = [
    "/dashboard/expert/comments",
    "/dashboard/designer/comments",
    `/dashboard/expert/projects/${projectId}`,
    `/dashboard/designer/projects/${projectId}`,
    `/dashboard/head/projects/${projectId}`,
    `/dashboard/archivist/projects/${projectId}`,
  ];

  if (threadId) {
    paths.push(`/dashboard/expert/comments/${threadId}`);
    paths.push(`/dashboard/designer/comments/${threadId}`);
  }

  for (const path of paths) {
    revalidatePath(path);
  }
}

async function getThreadForMember(
  threadId: string,
  currentUserId: string,
  role: UserRole,
) {
  const thread = await prisma.commentThread.findFirst({
    where: {
      id: threadId,
      document: {
        project: {
          members: {
            some: {
              userId: currentUserId,
              role,
            },
          },
        },
      },
    },
    select: {
      id: true,
      status: true,
      createdById: true,
      document: {
        select: {
          id: true,
          status: true,
          projectId: true,
          title: true,
          authorId: true,
        },
      },
    },
  });

  if (!thread) {
    throw new CommentThreadActionError(
      "Зауваження не знайдено або доступ заборонено.",
    );
  }

  return thread;
}

export async function createCommentThread(
  _previousState: CommentThreadActionState,
  formData: FormData,
): Promise<CommentThreadActionState> {
  try {
    const currentUser = await requireRole([UserRole.EXPERT]);
    const input = parseForm(
      createThreadSchema.safeParse({
        projectId: formData.get("projectId"),
        documentId: formData.get("documentId"),
        documentVersionId: formData.get("documentVersionId") ?? "",
        title: formData.get("title") ?? "",
        section: formData.get("section") ?? "",
        content: formData.get("content"),
      }),
    );

    const document = await prisma.document.findFirst({
      where: {
        id: input.documentId,
        projectId: input.projectId,
        status: {
          not: DocumentStatus.ARCHIVED,
        },
        project: {
          members: {
            some: {
              userId: currentUser.id,
              role: UserRole.EXPERT,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        authorId: true,
        versions: input.documentVersionId
          ? {
              where: { id: input.documentVersionId },
              take: 1,
              select: { id: true },
            }
          : false,
      },
    });

    if (!document) {
      throw new CommentThreadActionError(
        "Документ не знайдено, архівовано або доступ заборонено.",
      );
    }

    if (input.documentVersionId && document.versions.length !== 1) {
      throw new CommentThreadActionError(
        "Обрана версія не належить цьому документу.",
      );
    }

    const thread = await prisma.$transaction(async (tx) => {
      const createdThread = await tx.commentThread.create({
        data: {
          documentId: input.documentId,
          documentVersionId: input.documentVersionId,
          title: input.title,
          section: input.section,
          createdById: currentUser.id,
          messages: {
            create: {
              content: input.content,
              authorId: currentUser.id,
            },
          },
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          action: "Створено зауваження до документа",
          entityType: "COMMENT_THREAD",
          entityId: createdThread.id,
          userId: currentUser.id,
          projectId: input.projectId,
        },
      });

      const designerUserIds = await getDesignerMemberUserIds(
        tx,
        input.projectId,
      );
      await createNotifications(
        tx,
        [document.authorId, ...designerUserIds].map((userId) => ({
          userId,
          actorId: currentUser.id,
          type: NotificationType.COMMENT_THREAD_CREATED,
          title: "Нове зауваження до документа",
          message: `Експерт створив зауваження до документа «${document.title}».`,
          href: getNotificationHref({
            destination: "COMMENT_THREAD",
            role: UserRole.DESIGNER,
            commentThreadId: createdThread.id,
          }),
          projectId: input.projectId,
          documentId: document.id,
          commentThreadId: createdThread.id,
        })),
      );

      return createdThread;
    });

    revalidateCommentThreads(input.projectId, thread.id);

    return { error: "", success: true, threadId: thread.id };
  } catch (error) {
    return getActionState(error);
  }
}

export async function replyToCommentThread(
  _previousState: CommentThreadActionState,
  formData: FormData,
): Promise<CommentThreadActionState> {
  try {
    const currentUser = await requireRole([
      UserRole.EXPERT,
      UserRole.DESIGNER,
    ]);
    const input = parseForm(
      replySchema.safeParse({
        threadId: formData.get("threadId"),
        content: formData.get("content"),
      }),
    );
    const thread = await getThreadForMember(
      input.threadId,
      currentUser.id,
      currentUser.role,
    );

    if (thread.document.status === DocumentStatus.ARCHIVED) {
      throw new CommentThreadActionError(
        "Не можна відповідати в зауваженні до архівованого документа.",
      );
    }

    if (!canReplyToCommentThread({ role: currentUser.role, status: thread.status })) {
      throw new CommentThreadActionError(
        "Це зауваження не приймає нові відповіді.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.commentMessage.create({
        data: {
          threadId: thread.id,
          authorId: currentUser.id,
          content: input.content,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          action: "Додано відповідь у зауваженні",
          entityType: "COMMENT_MESSAGE",
          entityId: createdMessage.id,
          userId: currentUser.id,
          projectId: thread.document.projectId,
        },
      });

      const [projectMembers, participantMessages] = await Promise.all([
        getProjectMembers(tx, thread.document.projectId, [
          UserRole.EXPERT,
          UserRole.DESIGNER,
        ]),
        tx.commentMessage.findMany({
          where: {
            threadId: thread.id,
            author: { isActive: true },
          },
          select: { authorId: true },
        }),
      ]);
      const participantIds = new Set([
        thread.createdById,
        thread.document.authorId,
        ...participantMessages.map(({ authorId }) => authorId),
      ]);
      await createNotifications(
        tx,
        projectMembers
          .filter(({ userId }) => participantIds.has(userId))
          .map(({ userId, role }) => ({
            userId,
            actorId: currentUser.id,
            type: NotificationType.COMMENT_REPLY_CREATED,
            title: "Нова відповідь у зауваженні",
            message: `У зауваженні до документа «${thread.document.title}» з’явилася нова відповідь.`,
            href: getNotificationHref({
              destination: "COMMENT_THREAD",
              role,
              commentThreadId: thread.id,
            }),
            projectId: thread.document.projectId,
            documentId: thread.document.id,
            commentThreadId: thread.id,
          })),
      );

      return createdMessage;
    });

    revalidateCommentThreads(thread.document.projectId, thread.id);

    return { error: "", success: true, threadId: thread.id };
  } catch (error) {
    return getActionState(error);
  }
}

export async function markCommentThreadResolved(
  _previousState: CommentThreadActionState,
  formData: FormData,
): Promise<CommentThreadActionState> {
  try {
    const currentUser = await requireRole([UserRole.DESIGNER]);
    const input = parseForm(
      transitionSchema.safeParse({ threadId: formData.get("threadId") }),
    );
    const thread = await getThreadForMember(
      input.threadId,
      currentUser.id,
      UserRole.DESIGNER,
    );

    if (!canMarkCommentThreadResolved({ role: currentUser.role, status: thread.status })) {
      throw new CommentThreadActionError(
        "Зауваження вже змінило статус. Оновіть сторінку.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.commentThread.updateMany({
        where: {
          id: thread.id,
          status: {
            in: [CommentThreadStatus.OPEN, CommentThreadStatus.RETURNED],
          },
        },
        data: {
          status: CommentThreadStatus.RESOLVED,
          resolvedById: currentUser.id,
          resolvedAt: new Date(),
          returnedAt: null,
        },
      });

      if (result.count !== 1) {
        throw new CommentThreadActionError(
          "Зауваження вже змінило статус. Оновіть сторінку.",
        );
      }

      await tx.auditLog.create({
        data: {
          action: "Зауваження позначено виконаним",
          entityType: "COMMENT_THREAD",
          entityId: thread.id,
          userId: currentUser.id,
          projectId: thread.document.projectId,
        },
      });

      const expertMembers = await getProjectMembers(
        tx,
        thread.document.projectId,
        [UserRole.EXPERT],
      );
      await createNotifications(
        tx,
        expertMembers.map(({ userId, role }) => ({
          userId,
          actorId: currentUser.id,
          type: NotificationType.COMMENT_THREAD_RESOLVED,
          title: "Зауваження позначено виконаним",
          message: `Дизайнер позначив зауваження до документа «${thread.document.title}» виконаним.`,
          href: getNotificationHref({
            destination: "COMMENT_THREAD",
            role,
            commentThreadId: thread.id,
          }),
          projectId: thread.document.projectId,
          documentId: thread.document.id,
          commentThreadId: thread.id,
        })),
      );
    });

    revalidateCommentThreads(thread.document.projectId, thread.id);
    return { error: "", success: true, threadId: thread.id };
  } catch (error) {
    return getActionState(error);
  }
}

export async function returnCommentThread(
  _previousState: CommentThreadActionState,
  formData: FormData,
): Promise<CommentThreadActionState> {
  try {
    const currentUser = await requireRole([UserRole.EXPERT]);
    const input = parseForm(
      returnSchema.safeParse({
        threadId: formData.get("threadId"),
        reason: formData.get("reason") ?? "",
      }),
    );
    const thread = await getThreadForMember(
      input.threadId,
      currentUser.id,
      UserRole.EXPERT,
    );

    if (!canReturnCommentThread({ role: currentUser.role, status: thread.status })) {
      throw new CommentThreadActionError(
        "Повернути можна лише виконане зауваження.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.commentThread.updateMany({
        where: {
          id: thread.id,
          status: CommentThreadStatus.RESOLVED,
        },
        data: {
          status: CommentThreadStatus.RETURNED,
          resolvedById: null,
          resolvedAt: null,
          returnedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        throw new CommentThreadActionError(
          "Зауваження вже змінило статус. Оновіть сторінку.",
        );
      }

      if (input.reason) {
        await tx.commentMessage.create({
          data: {
            threadId: thread.id,
            authorId: currentUser.id,
            content: input.reason,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "Зауваження повернено на доопрацювання",
          entityType: "COMMENT_THREAD",
          entityId: thread.id,
          userId: currentUser.id,
          projectId: thread.document.projectId,
        },
      });

      const designerMembers = await getProjectMembers(
        tx,
        thread.document.projectId,
        [UserRole.DESIGNER],
      );
      await createNotifications(
        tx,
        designerMembers.map(({ userId, role }) => ({
          userId,
          actorId: currentUser.id,
          type: NotificationType.COMMENT_THREAD_RETURNED,
          title: "Зауваження повернено",
          message: `Експерт повернув зауваження до документа «${thread.document.title}» на доопрацювання.`,
          href: getNotificationHref({
            destination: "COMMENT_THREAD",
            role,
            commentThreadId: thread.id,
          }),
          projectId: thread.document.projectId,
          documentId: thread.document.id,
          commentThreadId: thread.id,
        })),
      );
    });

    revalidateCommentThreads(thread.document.projectId, thread.id);
    return { error: "", success: true, threadId: thread.id };
  } catch (error) {
    return getActionState(error);
  }
}

export async function deleteCommentMessage(
  _previousState: CommentThreadActionState,
  formData: FormData,
): Promise<CommentThreadActionState> {
  try {
    const currentUser = await requireRole([
      UserRole.EXPERT,
      UserRole.DESIGNER,
    ]);
    const input = parseForm(
      deleteMessageSchema.safeParse({ messageId: formData.get("messageId") }),
    );
    const message = await prisma.commentMessage.findFirst({
      where: {
        id: input.messageId,
        thread: {
          document: {
            project: {
              members: {
                some: {
                  userId: currentUser.id,
                  role: currentUser.role,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        authorId: true,
        createdAt: true,
        deletedAt: true,
        thread: {
          select: {
            id: true,
            document: {
              select: { projectId: true },
            },
            messages: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });

    if (!message) {
      throw new CommentThreadActionError(
        "Повідомлення не знайдено або доступ заборонено.",
      );
    }

    if (message.thread.messages[0]?.id === message.id) {
      throw new CommentThreadActionError(
        "Перше повідомлення зауваження не можна видалити.",
      );
    }

    if (!canDeleteCommentMessage({
      role: currentUser.role,
      actorUserId: currentUser.id,
      authorId: message.authorId,
      createdAt: message.createdAt,
      deletedAt: message.deletedAt,
    })) {
      throw new CommentThreadActionError(
        "Видалити можна лише власне повідомлення протягом 15 хвилин.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.commentMessage.updateMany({
        where: {
          id: message.id,
          authorId: currentUser.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedById: currentUser.id,
        },
      });

      if (result.count !== 1) {
        throw new CommentThreadActionError(
          "Повідомлення вже видалено. Оновіть сторінку.",
        );
      }

      await tx.auditLog.create({
        data: {
          action: "Повідомлення в зауваженні видалено",
          entityType: "COMMENT_MESSAGE",
          entityId: message.id,
          userId: currentUser.id,
          projectId: message.thread.document.projectId,
        },
      });
    });

    revalidateCommentThreads(
      message.thread.document.projectId,
      message.thread.id,
    );
    return { error: "", success: true, threadId: message.thread.id };
  } catch (error) {
    return getActionState(error);
  }
}
