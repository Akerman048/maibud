import type { UserRole } from "@/app/generated/prisma/client";

export function isNotificationOwnedByUser({
  notificationUserId,
  currentUserId,
}: {
  notificationUserId: string;
  currentUserId: string;
}) {
  return notificationUserId === currentUserId;
}

export function shouldNotifyActor({
  recipientUserId,
  actorUserId,
}: {
  recipientUserId: string;
  actorUserId?: string;
}) {
  return !actorUserId || recipientUserId !== actorUserId;
}

export function isSafeNotificationHref(href: string | null | undefined) {
  if (!href) return false;

  const normalized = href.trim().toLowerCase();

  return (
    normalized.startsWith("/") &&
    !normalized.startsWith("//") &&
    !normalized.includes(":")
  );
}

export function getDashboardHref(role: UserRole) {
  return `/dashboard/${role.toLowerCase()}`;
}

export function getNotificationPageHref(role: UserRole) {
  return `/dashboard/${role.toLowerCase()}/notifications`;
}

export function getNotificationHref({
  destination,
  role,
  projectId,
  commentThreadId,
}: {
  destination: "PROJECT" | "COMMENT_THREAD" | "MEMBERS" | "DASHBOARD";
  role: UserRole;
  projectId?: string | null;
  commentThreadId?: string | null;
}) {
  if (destination === "DASHBOARD") {
    return getDashboardHref(role);
  }

  if (destination === "MEMBERS") {
    return role === "HEAD" ? "/dashboard/head/members" : null;
  }

  if (destination === "COMMENT_THREAD") {
    if (!commentThreadId) return null;
    if (role !== "EXPERT" && role !== "DESIGNER") return null;

    return `/dashboard/${role.toLowerCase()}/comments/${commentThreadId}`;
  }

  if (!projectId) return null;

  if (role === "HEAD") return `/dashboard/head/projects/${projectId}`;
  if (role === "EXPERT") return `/dashboard/expert/projects/${projectId}`;
  if (role === "DESIGNER") return `/dashboard/designer/projects/${projectId}`;
  if (role === "ARCHIVIST") {
    return `/dashboard/archivist/projects/${projectId}`;
  }

  return `/dashboard/client/projects/${projectId}`;
}

export function getUniqueNotificationRecipientIds(
  recipientUserIds: string[],
  actorUserId?: string,
) {
  return Array.from(
    new Set(
      recipientUserIds.filter((userId) =>
        shouldNotifyActor({
          recipientUserId: userId,
          actorUserId,
        }),
      ),
    ),
  );
}
