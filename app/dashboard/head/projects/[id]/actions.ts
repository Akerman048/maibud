"use server";

import { revalidatePath } from "next/cache";

import {
  NotificationType,
  UserRole,
} from "@/app/generated/prisma/client";
import {
  AuthorizationError,
  requireRole,
} from "@/lib/auth-guard";
import { canPublishDocument } from "@/lib/document-workflow";
import { getNotificationHref } from "@/lib/notification-policy";
import { getClientMemberUserIds } from "@/lib/notification-recipients";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { DocumentPublicationActionState } from "@/types/document-publication-action";

class DocumentPublicationError extends Error {}

async function getDocumentForPublication(
  documentId: string,
  currentUserId: string,
  currentUserRole: UserRole,
) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      ...(currentUserRole === UserRole.ARCHIVIST
        ? {}
        : {
            project: {
              members: {
                some: {
                  userId: currentUserId,
                  role: currentUserRole,
                },
              },
            },
          }),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      status: true,
      isPublishedToClient: true,
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  if (!document) {
    throw new DocumentPublicationError(
      "Документ не знайдено або доступ заборонено.",
    );
  }

  return document;
}

function revalidateDocumentPublication(projectId: string) {
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath(`/dashboard/archivist/projects/${projectId}`);
  revalidatePath(`/dashboard/client/projects/${projectId}`);
}

function getPublicationErrorState(
  error: unknown,
): DocumentPublicationActionState {
  if (error instanceof DocumentPublicationError) {
    return {
      error: error.message,
      success: false,
    };
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

  console.error("Document publication action failed", error);

  return {
    error: "Не вдалося змінити публікацію документа.",
    success: false,
  };
}

export async function publishDocumentToClient(
  _previousState: DocumentPublicationActionState,
  formData: FormData,
): Promise<DocumentPublicationActionState> {
  try {
    const currentUser = await requireRole([
      UserRole.HEAD,
      UserRole.ARCHIVIST,
    ]);
    const documentId = String(
      formData.get("documentId") ?? "",
    ).trim();

    if (!documentId) {
      throw new DocumentPublicationError("Не вказано документ.");
    }

    const document = await getDocumentForPublication(
      documentId,
      currentUser.id,
      currentUser.role,
    );

    if (!canPublishDocument(document.status)) {
      throw new DocumentPublicationError(
        "Для клієнта можна опублікувати лише погоджений документ.",
      );
    }

    if (document.versions.length === 0) {
      throw new DocumentPublicationError(
        "Документ без версій не можна опублікувати.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.document.updateMany({
        where: {
          id: document.id,
          status: "APPROVED",
          ...(currentUser.role === UserRole.ARCHIVIST
            ? {}
            : {
                project: {
                  members: {
                    some: {
                      userId: currentUser.id,
                      role: currentUser.role,
                    },
                  },
                },
              }),
        },
        data: {
          isPublishedToClient: true,
          publishedAt: new Date(),
          publishedById: currentUser.id,
        },
      });

      if (updateResult.count !== 1) {
        throw new DocumentPublicationError(
          "Статус документа вже змінився. Оновіть сторінку.",
        );
      }

      await tx.auditLog.create({
        data: {
          action: "Документ опубліковано для клієнта",
          entityType: "DOCUMENT",
          entityId: document.id,
          userId: currentUser.id,
          projectId: document.projectId,
        },
      });

      const clientUserIds = await getClientMemberUserIds(
        tx,
        document.projectId,
      );
      await createNotifications(
        tx,
        clientUserIds.map((userId) => ({
          userId,
          actorId: currentUser.id,
          type: NotificationType.DOCUMENT_PUBLISHED,
          title: "Опубліковано документ",
          message: `Для вас опубліковано документ «${document.title}».`,
          href: getNotificationHref({
            destination: "PROJECT",
            role: UserRole.CLIENT,
            projectId: document.projectId,
          }),
          projectId: document.projectId,
          documentId: document.id,
        })),
      );
    });

    revalidateDocumentPublication(document.projectId);

    return {
      error: "",
      success: true,
    };
  } catch (error) {
    return getPublicationErrorState(error);
  }
}

export async function unpublishDocumentFromClient(
  _previousState: DocumentPublicationActionState,
  formData: FormData,
): Promise<DocumentPublicationActionState> {
  try {
    const currentUser = await requireRole([
      UserRole.HEAD,
      UserRole.ARCHIVIST,
    ]);
    const documentId = String(
      formData.get("documentId") ?? "",
    ).trim();

    if (!documentId) {
      throw new DocumentPublicationError("Не вказано документ.");
    }

    const document = await getDocumentForPublication(
      documentId,
      currentUser.id,
      currentUser.role,
    );

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.document.updateMany({
        where: {
          id: document.id,
          ...(currentUser.role === UserRole.ARCHIVIST
            ? {}
            : {
                project: {
                  members: {
                    some: {
                      userId: currentUser.id,
                      role: currentUser.role,
                    },
                  },
                },
              }),
        },
        data: {
          isPublishedToClient: false,
          publishedAt: null,
          publishedById: null,
        },
      });

      if (updateResult.count !== 1) {
        throw new DocumentPublicationError(
          "Документ уже змінився або доступ до нього втрачено.",
        );
      }

      await tx.auditLog.create({
        data: {
          action: "Документ приховано від клієнта",
          entityType: "DOCUMENT",
          entityId: document.id,
          userId: currentUser.id,
          projectId: document.projectId,
        },
      });

      const clientUserIds = await getClientMemberUserIds(
        tx,
        document.projectId,
      );
      await createNotifications(
        tx,
        clientUserIds.map((userId) => ({
          userId,
          actorId: currentUser.id,
          type: NotificationType.DOCUMENT_UNPUBLISHED,
          title: "Документ більше недоступний",
          message: `Документ «${document.title}» приховано від клієнтського перегляду.`,
          href: getNotificationHref({
            destination: "PROJECT",
            role: UserRole.CLIENT,
            projectId: document.projectId,
          }),
          projectId: document.projectId,
          documentId: document.id,
        })),
      );
    });

    revalidateDocumentPublication(document.projectId);

    return {
      error: "",
      success: true,
    };
  } catch (error) {
    return getPublicationErrorState(error);
  }
}
