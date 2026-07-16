import "server-only";

import { DocumentStatus } from "@/app/generated/prisma/client";
import { getDashboardDateRangeStart, getDashboardPeriodDescription } from "@/lib/dashboard-date-range";
import { activeDocumentWhere, activeProjectWhere, getAssignedProjectWhere, hasActiveRole } from "@/lib/dashboard/dashboard-scopes";
import { prisma } from "@/lib/prisma";
import type { DashboardData, DashboardDateRange } from "@/types/dashboard";

export async function getClientDashboardData(
  currentUserId: string,
  dateRange: DashboardDateRange,
): Promise<DashboardData> {
  if (!(await hasActiveRole(currentUserId, "CLIENT"))) {
    return { stats: [], activity: [] };
  }

  const activeProject = activeProjectWhere(getAssignedProjectWhere(currentUserId, "CLIENT"));
  const activeDocument = activeDocumentWhere(activeProject);
  const publishedWhere = {
    AND: [
      activeDocument,
      { status: DocumentStatus.APPROVED, isPublishedToClient: true },
    ],
  };
  const rangeStart = getDashboardDateRangeStart(dateRange, new Date());

  const [projects, published, newlyPublished, unread] = await Promise.all([
    prisma.project.count({ where: activeProject }),
    prisma.document.count({ where: publishedWhere }),
    prisma.document.count({
      where: {
        AND: [publishedWhere, ...(rangeStart ? [{ publishedAt: { gte: rangeStart } }] : [{ publishedAt: { not: null } }])],
      },
    }),
    prisma.notification.count({ where: { userId: currentUserId, readAt: null } }),
  ]);

  return {
    stats: [
      { key: "projects", label: "Доступні проєкти", value: projects, href: "/dashboard/client", description: "Зараз" },
      { key: "published", label: "Опубліковані документи", value: published, description: "Зараз" },
      { key: "newly-published", label: "Нові опубліковані документи", value: newlyPublished, description: getDashboardPeriodDescription(dateRange) },
      { key: "unread", label: "Непрочитані сповіщення", value: unread, href: "/dashboard/client/notifications?filter=unread", description: "Зараз" },
    ],
    activity: [],
  };
}
