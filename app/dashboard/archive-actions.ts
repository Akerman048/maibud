"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import {
  canArchiveDocument,
  canArchiveProject,
  canRestoreDocument,
  canRestoreProject,
  getDocumentRestoreStatus,
  getProjectRestoreStatus,
} from "@/lib/archive-policy";
import {
  AuthorizationError,
  requireRole,
} from "@/lib/auth-guard";
import {
  getArchivedProjectHref,
  getNotificationHref,
} from "@/lib/notification-policy";
import { getProjectMembers } from "@/lib/notification-recipients";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { ArchiveActionState } from "@/types/archive-action";

class ArchiveActionError extends Error {}

const archiveSchema = z.object({
  id: z.string().trim().min(1, "Не вказано об’єкт."),
  reason: z
    .string()
    .trim()
    .max(1000, "Причина не може перевищувати 1000 символів.")
    .transform((value) => value || null),
});

const restoreSchema = z.object({
  id: z.string().trim().min(1, "Не вказано об’єкт."),
});

function parseInput<T>(result: z.ZodSafeParseResult<T>) {
  if (!result.success) {
    throw new ArchiveActionError(
      result.error.issues[0]?.message ?? "Некоректні дані форми.",
    );
  }

  return result.data;
}

function getArchiveActionState(error: unknown): ArchiveActionState {
  if (error instanceof ArchiveActionError) {
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

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return {
      error: "Дані вже змінилися. Оновіть сторінку та повторіть дію.",
      success: false,
    };
  }

  console.error("Archive action failed", error);
  return { error: "Не вдалося змінити стан архіву.", success: false };
}

function getProjectAccessWhere(
  userId: string,
  role: UserRole,
): Prisma.ProjectWhereInput {
  const organizationMembership = {
    some: {
      userId,
      role,
      removedAt: null,
      user: { isActive: true },
    },
  };

  if (role === UserRole.HEAD) {
    return {
      members: { some: { userId, role: UserRole.HEAD } },
      organization: { members: organizationMembership },
    };
  }

  return {
    organization: { members: organizationMembership },
  };
}

function revalidateArchive(projectId: string) {
  const paths = [
    "/dashboard/head",
    "/dashboard/head/archive",
    "/dashboard/archivist",
    "/dashboard/archivist/projects",
    "/dashboard/designer",
    "/dashboard/designer/archive",
    "/dashboard/expert",
    `/dashboard/head/projects/${projectId}`,
    `/dashboard/head/archive/${projectId}`,
    `/dashboard/archivist/projects/${projectId}`,
    `/dashboard/archivist/archive/${projectId}`,
    `/dashboard/designer/projects/${projectId}`,
    `/dashboard/designer/archive/${projectId}`,
    `/dashboard/expert/projects/${projectId}`,
    `/dashboard/client/projects/${projectId}`,
  ];

  for (const path of paths) revalidatePath(path);
}

async function getDocumentRecipients(
  tx: Prisma.TransactionClient,
  {
    projectId,
    authorId,
    includeClients,
  }: { projectId: string; authorId: string; includeClients: boolean },
) {
  const members = await getProjectMembers(tx, projectId, [
    UserRole.DESIGNER,
    UserRole.EXPERT,
    ...(includeClients ? [UserRole.CLIENT] : []),
  ]);
  const author = await tx.user.findFirst({
    where: { id: authorId, isActive: true },
    select: { id: true, role: true },
  });

  return Array.from(
    new Map(
      [...members, ...(author ? [{ userId: author.id, role: author.role }] : [])]
        .map((recipient) => [recipient.userId, recipient]),
    ).values(),
  );
}

export async function archiveProject(
  _previousState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  try {
    const currentUser = await requireRole([UserRole.HEAD, UserRole.ARCHIVIST]);
    const input = parseInput(archiveSchema.safeParse({
      id: formData.get("projectId"),
      reason: formData.get("reason") ?? "",
    }));
    const accessWhere = getProjectAccessWhere(currentUser.id, currentUser.role);
    const project = await prisma.project.findFirst({
      where: { id: input.id, ...accessWhere },
      select: { id: true, name: true, status: true },
    });

    if (!project) {
      throw new ArchiveActionError("Проєкт не знайдено або доступ заборонено.");
    }
    if (!canArchiveProject({ role: currentUser.role, projectStatus: project.status })) {
      throw new ArchiveActionError("Проєкт уже перебуває в архіві.");
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.project.updateMany({
        where: {
          id: project.id,
          status: project.status,
          ...accessWhere,
        },
        data: {
          previousStatus: project.status,
          status: "ARCHIVED",
          archivedAt: new Date(),
          archivedById: currentUser.id,
          archiveReason: input.reason,
          restoredAt: null,
          restoredById: null,
        },
      });
      if (result.count !== 1) {
        throw new ArchiveActionError("Проєкт уже змінив стан. Оновіть сторінку.");
      }

      await tx.document.updateMany({
        where: { projectId: project.id, isPublishedToClient: true },
        data: {
          isPublishedToClient: false,
          publishedAt: null,
          publishedById: null,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "Проєкт переміщено в архів",
          entityType: "PROJECT",
          entityId: project.id,
          userId: currentUser.id,
          projectId: project.id,
        },
      });
      const members = await getProjectMembers(tx, project.id, [
        UserRole.HEAD,
        UserRole.EXPERT,
        UserRole.DESIGNER,
        UserRole.ARCHIVIST,
        UserRole.CLIENT,
      ]);
      await createNotifications(tx, members.map(({ userId, role }) => ({
        userId,
        actorId: currentUser.id,
        type: "PROJECT_ARCHIVED",
        title: "Проєкт архівовано",
        message: `Проєкт «${project.name}» переміщено в архів.`,
        href: getArchivedProjectHref(role, project.id),
        projectId: project.id,
      })));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidateArchive(project.id);
    return { error: "", success: true };
  } catch (error) {
    return getArchiveActionState(error);
  }
}

export async function restoreProject(
  _previousState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  try {
    const currentUser = await requireRole([UserRole.HEAD, UserRole.ARCHIVIST]);
    const input = parseInput(restoreSchema.safeParse({ id: formData.get("projectId") }));
    const accessWhere = getProjectAccessWhere(currentUser.id, currentUser.role);
    const project = await prisma.project.findFirst({
      where: { id: input.id, ...accessWhere },
      select: { id: true, name: true, status: true, previousStatus: true },
    });

    if (!project) {
      throw new ArchiveActionError("Проєкт не знайдено або доступ заборонено.");
    }
    if (!canRestoreProject({ role: currentUser.role, projectStatus: project.status })) {
      throw new ArchiveActionError("Відновити можна лише архівний проєкт.");
    }
    const restoreStatus = getProjectRestoreStatus(project.previousStatus);

    await prisma.$transaction(async (tx) => {
      const result = await tx.project.updateMany({
        where: {
          id: project.id,
          status: "ARCHIVED",
          previousStatus: project.previousStatus,
          ...accessWhere,
        },
        data: {
          status: restoreStatus,
          previousStatus: null,
          restoredAt: new Date(),
          restoredById: currentUser.id,
        },
      });
      if (result.count !== 1) {
        throw new ArchiveActionError("Проєкт уже змінив стан. Оновіть сторінку.");
      }
      await tx.auditLog.create({
        data: {
          action: "Проєкт відновлено з архіву",
          entityType: "PROJECT",
          entityId: project.id,
          userId: currentUser.id,
          projectId: project.id,
        },
      });
      const members = await getProjectMembers(tx, project.id, [
        UserRole.HEAD,
        UserRole.EXPERT,
        UserRole.DESIGNER,
        UserRole.ARCHIVIST,
        UserRole.CLIENT,
      ]);
      await createNotifications(tx, members.map(({ userId, role }) => ({
        userId,
        actorId: currentUser.id,
        type: "PROJECT_RESTORED",
        title: "Проєкт відновлено",
        message: `Проєкт «${project.name}» відновлено з архіву.`,
        href: getNotificationHref({ destination: "PROJECT", role, projectId: project.id }),
        projectId: project.id,
      })));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidateArchive(project.id);
    return { error: "", success: true };
  } catch (error) {
    return getArchiveActionState(error);
  }
}

export async function archiveDocument(
  _previousState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  try {
    const currentUser = await requireRole([UserRole.HEAD, UserRole.ARCHIVIST]);
    const input = parseInput(archiveSchema.safeParse({
      id: formData.get("documentId"),
      reason: formData.get("reason") ?? "",
    }));
    const accessWhere = getProjectAccessWhere(currentUser.id, currentUser.role);
    const document = await prisma.document.findFirst({
      where: { id: input.id, project: accessWhere },
      select: {
        id: true,
        title: true,
        status: true,
        authorId: true,
        projectId: true,
        isPublishedToClient: true,
        project: { select: { status: true } },
      },
    });

    if (!document) {
      throw new ArchiveActionError("Документ не знайдено або доступ заборонено.");
    }
    if (document.project.status === "ARCHIVED") {
      throw new ArchiveActionError("Архівний проєкт доступний лише для читання.");
    }
    if (!canArchiveDocument({ role: currentUser.role, status: document.status })) {
      throw new ArchiveActionError("Архівувати можна лише погоджений або відхилений документ.");
    }

    await prisma.$transaction(async (tx) => {
      const result = await tx.document.updateMany({
        where: {
          id: document.id,
          status: document.status,
          project: { status: { not: "ARCHIVED" }, ...accessWhere },
        },
        data: {
          previousStatus: document.status,
          status: "ARCHIVED",
          archivedAt: new Date(),
          archivedById: currentUser.id,
          archiveReason: input.reason,
          restoredAt: null,
          restoredById: null,
          isPublishedToClient: false,
          publishedAt: null,
          publishedById: null,
        },
      });
      if (result.count !== 1) {
        throw new ArchiveActionError("Документ уже змінив стан. Оновіть сторінку.");
      }
      await tx.auditLog.create({
        data: {
          action: "Документ переміщено в архів",
          entityType: "DOCUMENT",
          entityId: document.id,
          userId: currentUser.id,
          projectId: document.projectId,
        },
      });
      const recipients = await getDocumentRecipients(tx, {
        projectId: document.projectId,
        authorId: document.authorId,
        includeClients: document.isPublishedToClient,
      });
      await createNotifications(tx, recipients.map(({ userId, role }) => ({
        userId,
        actorId: currentUser.id,
        type: "DOCUMENT_ARCHIVED",
        title: "Документ архівовано",
        message: `Документ «${document.title}» переміщено в архів.`,
        href: getArchivedProjectHref(role, document.projectId),
        projectId: document.projectId,
        documentId: document.id,
      })));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidateArchive(document.projectId);
    return { error: "", success: true };
  } catch (error) {
    return getArchiveActionState(error);
  }
}

export async function restoreDocument(
  _previousState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  try {
    const currentUser = await requireRole([UserRole.HEAD, UserRole.ARCHIVIST]);
    const input = parseInput(restoreSchema.safeParse({ id: formData.get("documentId") }));
    const accessWhere = getProjectAccessWhere(currentUser.id, currentUser.role);
    const document = await prisma.document.findFirst({
      where: { id: input.id, project: accessWhere },
      select: {
        id: true,
        title: true,
        status: true,
        previousStatus: true,
        authorId: true,
        projectId: true,
        project: { select: { status: true } },
      },
    });

    if (!document) {
      throw new ArchiveActionError("Документ не знайдено або доступ заборонено.");
    }
    if (document.project.status === "ARCHIVED") {
      throw new ArchiveActionError("Спочатку відновіть проєкт.");
    }
    if (!canRestoreDocument({
      role: currentUser.role,
      status: document.status,
      previousStatus: document.previousStatus,
    })) {
      throw new ArchiveActionError("Документ не має коректного стану для відновлення.");
    }
    const restoreStatus = getDocumentRestoreStatus(document.previousStatus);

    await prisma.$transaction(async (tx) => {
      const result = await tx.document.updateMany({
        where: {
          id: document.id,
          status: "ARCHIVED",
          previousStatus: restoreStatus,
          project: { status: { not: "ARCHIVED" }, ...accessWhere },
        },
        data: {
          status: restoreStatus,
          previousStatus: null,
          restoredAt: new Date(),
          restoredById: currentUser.id,
        },
      });
      if (result.count !== 1) {
        throw new ArchiveActionError("Документ уже змінив стан. Оновіть сторінку.");
      }
      await tx.auditLog.create({
        data: {
          action: "Документ відновлено з архіву",
          entityType: "DOCUMENT",
          entityId: document.id,
          userId: currentUser.id,
          projectId: document.projectId,
        },
      });
      const recipients = await getDocumentRecipients(tx, {
        projectId: document.projectId,
        authorId: document.authorId,
        includeClients: false,
      });
      await createNotifications(tx, recipients.map(({ userId, role }) => ({
        userId,
        actorId: currentUser.id,
        type: "DOCUMENT_RESTORED",
        title: "Документ відновлено",
        message: `Документ «${document.title}» відновлено з архіву.`,
        href: getNotificationHref({ destination: "PROJECT", role, projectId: document.projectId }),
        projectId: document.projectId,
        documentId: document.id,
      })));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidateArchive(document.projectId);
    return { error: "", success: true };
  } catch (error) {
    return getArchiveActionState(error);
  }
}
