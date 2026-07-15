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
import { canReviewDocument } from "@/lib/document-workflow";
import { getNotificationHref } from "@/lib/notification-policy";
import { getDesignerMemberUserIds } from "@/lib/notification-recipients";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type DocumentReviewActionState = {
  error: string;
  success: boolean;
};

class DocumentReviewError extends Error {}

const REVIEW_PATHS = [
  "/dashboard/expert",
  "/dashboard/expert/documents",
  "/dashboard/designer/documents",
] as const;

function revalidateDocumentReview(projectId: string) {
  for (const path of REVIEW_PATHS) {
    revalidatePath(path);
  }

  revalidatePath(`/dashboard/expert/projects/${projectId}`);
  revalidatePath(`/dashboard/designer/projects/${projectId}`);
  revalidatePath(`/dashboard/head/projects/${projectId}`);
  revalidatePath(`/dashboard/archivist/projects/${projectId}`);
  revalidatePath(`/dashboard/client/projects/${projectId}`);
  revalidatePath(`/project/${projectId}`);
}

async function getSubmittedDocumentForExpert(
  documentId: string,
  currentUserId: string,
) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      project: {
        members: {
          some: {
            userId: currentUserId,
            role: UserRole.EXPERT,
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      authorId: true,
      projectId: true,
      status: true,
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
    throw new DocumentReviewError(
      "Документ не знайдено або доступ заборонено.",
    );
  }

  if (!canReviewDocument(document.status)) {
    throw new DocumentReviewError(
      "Документ уже оброблено або він не перебуває на перевірці.",
    );
  }

  if (document.versions.length === 0) {
    throw new DocumentReviewError("Документ не має жодної версії.");
  }

  return document;
}

async function reviewDocument({
  documentId,
  currentUserId,
  rejectionReason,
}: {
  documentId: string;
  currentUserId: string;
  rejectionReason: string | null;
}) {
  const document = await getSubmittedDocumentForExpert(
    documentId,
    currentUserId,
  );
  const isRejected = rejectionReason !== null;

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.document.updateMany({
      where: {
        id: document.id,
        status: "SUBMITTED",
        project: {
          members: {
            some: {
              userId: currentUserId,
              role: UserRole.EXPERT,
            },
          },
        },
      },
      data: {
        status: isRejected ? "REJECTED" : "APPROVED",
        reviewedAt: new Date(),
        reviewedById: currentUserId,
        rejectionReason,
      },
    });

    if (updateResult.count !== 1) {
      throw new DocumentReviewError(
        "Статус документа вже змінився. Оновіть сторінку.",
      );
    }

    await tx.auditLog.create({
      data: {
        action: isRejected
          ? "Документ відхилено"
          : "Документ погоджено",
        entityType: "DOCUMENT",
        entityId: document.id,
        userId: currentUserId,
        projectId: document.projectId,
      },
    });

    const designerUserIds = await getDesignerMemberUserIds(
      tx,
      document.projectId,
    );
    const recipients = [document.authorId, ...designerUserIds];
    await createNotifications(
      tx,
      recipients.map((userId) => ({
        userId,
        actorId: currentUserId,
        type: isRejected
          ? NotificationType.DOCUMENT_REJECTED
          : NotificationType.DOCUMENT_APPROVED,
        title: isRejected ? "Документ відхилено" : "Документ погоджено",
        message: isRejected
          ? `Експерт відхилив документ «${document.title}». Відкрийте документ, щоб переглянути причину.`
          : `Експерт погодив документ «${document.title}».`,
        href: getNotificationHref({
          destination: "PROJECT",
          role: UserRole.DESIGNER,
          projectId: document.projectId,
        }),
        projectId: document.projectId,
        documentId: document.id,
      })),
    );
  });

  revalidateDocumentReview(document.projectId);
}

function getReviewErrorState(
  error: unknown,
): DocumentReviewActionState {
  if (error instanceof DocumentReviewError) {
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

  console.error("Document review action failed", error);

  return {
    error: "Не вдалося оновити статус документа.",
    success: false,
  };
}

export async function approveDocument(
  _previousState: DocumentReviewActionState,
  formData: FormData,
): Promise<DocumentReviewActionState> {
  try {
    const currentUser = await requireRole([UserRole.EXPERT]);
    const documentId = String(
      formData.get("documentId") ?? "",
    ).trim();

    if (!documentId) {
      throw new DocumentReviewError("Не вказано документ.");
    }

    await reviewDocument({
      documentId,
      currentUserId: currentUser.id,
      rejectionReason: null,
    });

    return {
      error: "",
      success: true,
    };
  } catch (error) {
    return getReviewErrorState(error);
  }
}

export async function rejectDocument(
  _previousState: DocumentReviewActionState,
  formData: FormData,
): Promise<DocumentReviewActionState> {
  try {
    const currentUser = await requireRole([UserRole.EXPERT]);
    const documentId = String(
      formData.get("documentId") ?? "",
    ).trim();
    const rejectionReason = String(
      formData.get("rejectionReason") ?? "",
    ).trim();

    if (!documentId) {
      throw new DocumentReviewError("Не вказано документ.");
    }

    if (rejectionReason.length < 5) {
      throw new DocumentReviewError(
        "Причина відхилення має містити щонайменше 5 символів.",
      );
    }

    if (rejectionReason.length > 2000) {
      throw new DocumentReviewError(
        "Причина відхилення не може перевищувати 2000 символів.",
      );
    }

    await reviewDocument({
      documentId,
      currentUserId: currentUser.id,
      rejectionReason,
    });

    return {
      error: "",
      success: true,
    };
  } catch (error) {
    return getReviewErrorState(error);
  }
}

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
