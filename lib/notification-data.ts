import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  NotificationFilter,
  NotificationPage,
} from "@/types/notification";

const PAGE_SIZES = new Set([10, 20, 50]);

export function normalizeNotificationQuery({
  page,
  pageSize,
  filter,
}: {
  page?: number;
  pageSize?: number;
  filter?: string;
}) {
  return {
    page: Number.isSafeInteger(page) && (page ?? 0) >= 1 ? page! : 1,
    pageSize: PAGE_SIZES.has(pageSize ?? 0) ? pageSize! : 20,
    filter: (filter === "unread" || filter === "read" ? filter : "all") as NotificationFilter,
  };
}

export async function getNotificationsForUser({
  userId,
  page,
  pageSize,
  filter,
}: {
  userId: string;
  page?: number;
  pageSize?: number;
  filter?: string;
}): Promise<NotificationPage> {
  const normalized = normalizeNotificationQuery({ page, pageSize, filter });
  const readWhere =
    normalized.filter === "unread"
      ? { readAt: null }
      : normalized.filter === "read"
        ? { readAt: { not: null } }
        : {};
  const where = { userId, ...readWhere };
  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
    totalPages: Math.max(1, Math.ceil(total / normalized.pageSize)),
    unreadCount,
  };
}

export function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
