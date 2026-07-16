import "server-only";

import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma } from "@/app/generated/prisma/client";
import { firstQueryValue, normalizeSearchQuery, parseDateEndParam, parseDateParam, parsePage, parsePageSize, parseSortDirection } from "@/lib/query-params";
import { getNotificationSortField } from "@/lib/search-sort-policy";
import type {
  NotificationFilter,
  NotificationPage,
} from "@/types/notification";

export function normalizeNotificationQuery({
  page,
  pageSize,
  filter,
  search,
  type,
  projectId,
  actorId,
  createdFrom,
  createdTo,
  sortBy,
  sortDirection,
}: {
  page?: number | string;
  pageSize?: number | string;
  filter?: string;
  search?: string;
  type?: string;
  projectId?: string;
  actorId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortDirection?: string;
}) {
  return {
    page: parsePage(page),
    pageSize: parsePageSize(pageSize),
    filter: (filter === "unread" || filter === "read" ? filter : "all") as NotificationFilter,
    search: normalizeSearchQuery(search),
    type: type && Object.values(NotificationType).includes(type as NotificationType) ? type as NotificationType : undefined,
    projectId: projectId || undefined,
    actorId: actorId || undefined,
    createdFrom: parseDateParam(createdFrom) ?? undefined,
    createdTo: parseDateEndParam(createdTo) ?? undefined,
    sortBy: getNotificationSortField(sortBy),
    sortDirection: parseSortDirection(sortDirection),
  };
}

export function normalizeNotificationSearchParams(raw: Record<string, string | string[] | undefined>) {
  const value = (key: string) => firstQueryValue(raw[key]);
  return normalizeNotificationQuery({ page: value("page"), pageSize: value("pageSize"), filter: value("filter"), search: value("search"), type: value("type"), projectId: value("projectId"), actorId: value("actorId"), createdFrom: value("createdFrom"), createdTo: value("createdTo"), sortBy: value("sortBy"), sortDirection: value("sortDirection") });
}

export async function getNotificationsForUser({
  userId,
  page,
  pageSize,
  filter,
  search,
  type,
  projectId,
  actorId,
  createdFrom,
  createdTo,
  sortBy,
  sortDirection,
}: {
  userId: string;
  page?: number;
  pageSize?: number;
  filter?: string;
  search?: string;
  type?: string;
  projectId?: string;
  actorId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  sortBy?: string;
  sortDirection?: string;
}): Promise<NotificationPage> {
  const normalized = normalizeNotificationQuery({ page, pageSize, filter, search, type, projectId, actorId, createdFrom: createdFrom?.toISOString(), createdTo: createdTo?.toISOString(), sortBy, sortDirection });
  const readWhere =
    normalized.filter === "unread"
      ? { readAt: null }
      : normalized.filter === "read"
        ? { readAt: { not: null } }
        : {};
  const createdAt = normalized.createdFrom || normalized.createdTo ? { ...(normalized.createdFrom ? { gte: normalized.createdFrom } : {}), ...(normalized.createdTo ? { lte: normalized.createdTo } : {}) } : undefined;
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...readWhere,
    ...(normalized.type ? { type: normalized.type } : {}),
    ...(normalized.projectId ? { projectId: normalized.projectId } : {}),
    ...(normalized.actorId ? { actorId: normalized.actorId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(normalized.search ? { OR: [
      { title: { contains: normalized.search, mode: "insensitive" } },
      { message: { contains: normalized.search, mode: "insensitive" } },
      { project: { name: { contains: normalized.search, mode: "insensitive" } } },
      { actor: { name: { contains: normalized.search, mode: "insensitive" } } },
    ] } : {}),
  };
  const orderBy: Prisma.NotificationOrderByWithRelationInput[] =
    normalized.sortBy === "createdAt"
      ? [
          { createdAt: normalized.sortDirection },
          { id: normalized.sortDirection },
        ]
      : [{ createdAt: "desc" }, { id: "desc" }];
  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy,
      skip: (normalized.page - 1) * normalized.pageSize,
      take: normalized.pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        href: true,
        readAt: true,
        createdAt: true,
        actor: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    items: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href,
      readAt: notification.readAt?.toISOString() ?? null,
      isRead: Boolean(notification.readAt),
      actorName: notification.actor?.name ?? null,
      projectName: notification.project?.name ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    page: normalized.page,
    pageSize: normalized.pageSize,
    total,
    totalPages: Math.ceil(total / normalized.pageSize),
    unreadCount,
  };
}

export function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
