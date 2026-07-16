import "server-only";

import { Prisma, type UserRole } from "@/app/generated/prisma/client";
import { getActivityHref } from "@/lib/activity-href";
import { getDashboardDateRangeStart } from "@/lib/dashboard-date-range";
import { prisma } from "@/lib/prisma";
import type { ActivityFeedItem, DashboardDateRange } from "@/types/dashboard";

type ActivityFeedInput = {
  currentUserId: string;
  role: UserRole;
  organizationId?: string;
  projectIds?: string[];
  dateRange: DashboardDateRange;
  limit?: number;
};

function buildActivityProjectScope({
  currentUserId,
  role,
  organizationId,
  projectIds,
}: Omit<ActivityFeedInput, "dateRange" | "limit">): Prisma.ProjectWhereInput | null {
  const requestedProjects = projectIds?.length
    ? { id: { in: projectIds.slice(0, 50) } }
    : {};

  if (role === "HEAD" && organizationId) {
    return {
      ...requestedProjects,
      organizationId,
      members: { some: { userId: currentUserId, role: "HEAD" } },
      organization: {
        members: {
          some: {
            userId: currentUserId,
            role: "HEAD",
            removedAt: null,
            user: { isActive: true, role: "HEAD" },
          },
        },
      },
    };
  }

  if (role === "ARCHIVIST" && organizationId) {
    return {
      ...requestedProjects,
      organizationId,
      organization: {
        members: {
          some: {
            userId: currentUserId,
            role: "ARCHIVIST",
            removedAt: null,
            user: { isActive: true, role: "ARCHIVIST" },
          },
        },
      },
    };
  }

  if (role === "EXPERT" || role === "DESIGNER") {
    return {
      ...requestedProjects,
      members: {
        some: {
          userId: currentUserId,
          role,
          user: { isActive: true, role },
        },
      },
    };
  }

  return null;
}

export async function getActivityFeed({
  currentUserId,
  role,
  organizationId,
  projectIds,
  dateRange,
  limit = 20,
}: ActivityFeedInput): Promise<ActivityFeedItem[]> {
  if (role === "CLIENT") return [];

  const projectScope = buildActivityProjectScope({
    currentUserId,
    role,
    organizationId,
    projectIds,
  });
  if (!projectScope) return [];

  const boundedLimit = Number.isSafeInteger(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 20;
  const rangeStart = getDashboardDateRangeStart(dateRange, new Date());

  const records = await prisma.auditLog.findMany({
    where: {
      project: projectScope,
      ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: boundedLimit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      projectId: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, role: true } },
      project: { select: { name: true } },
    },
  });

  return records.map((record) => ({
    id: record.id,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    projectId: record.projectId,
    projectName: record.project?.name ?? null,
    actorId: record.userId,
    actorName: record.user?.name ?? null,
    actorRole: record.user?.role ?? null,
    createdAt: record.createdAt.toISOString(),
    href: getActivityHref({
      role,
      entityType: record.entityType,
      entityId: record.entityId,
      projectId: record.projectId,
    }),
  }));
}
