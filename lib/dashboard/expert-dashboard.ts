import "server-only";

import { CommentThreadStatus, DocumentStatus } from "@/app/generated/prisma/client";
import { getActivityFeed } from "@/lib/activity-feed";
import { getDashboardDateRangeStart, getDashboardPeriodDescription } from "@/lib/dashboard-date-range";
import { activeDocumentWhere, activeProjectWhere, getAssignedProjectWhere, hasActiveRole } from "@/lib/dashboard/dashboard-scopes";
import { prisma } from "@/lib/prisma";
import type { DashboardData, DashboardDateRange } from "@/types/dashboard";

export async function getExpertDashboardData(
  currentUserId: string,
  dateRange: DashboardDateRange,
): Promise<DashboardData> {
  if (!(await hasActiveRole(currentUserId, "EXPERT"))) {
    return { stats: [], activity: [] };
  }

  const activeProject = activeProjectWhere(getAssignedProjectWhere(currentUserId, "EXPERT"));
  const activeDocument = activeDocumentWhere(activeProject);
  const rangeStart = getDashboardDateRangeStart(dateRange, new Date());
  const period = getDashboardPeriodDescription(dateRange);

  const [projects, submitted, approved, rejected, openThreads, awaitingDecision, unread, activity] = await Promise.all([
    prisma.project.count({ where: activeProject }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.SUBMITTED }] } }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.APPROVED, ...(rangeStart ? { reviewedAt: { gte: rangeStart } } : {}) }] } }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.REJECTED, ...(rangeStart ? { reviewedAt: { gte: rangeStart } } : {}) }] } }),
    prisma.commentThread.count({
      where: {
        createdById: currentUserId,
        status: { in: [CommentThreadStatus.OPEN, CommentThreadStatus.RETURNED] },
        document: activeDocument,
      },
    }),
    prisma.commentThread.count({
      where: {
        createdById: currentUserId,
        status: CommentThreadStatus.RESOLVED,
        resolvedBy: { role: "DESIGNER" },
        document: activeDocument,
      },
    }),
    prisma.notification.count({ where: { userId: currentUserId, readAt: null } }),
    getActivityFeed({ currentUserId, role: "EXPERT", dateRange }),
  ]);

  return {
    stats: [
      { key: "projects", label: "Призначені проєкти", value: projects, href: "/dashboard/expert", description: "Зараз" },
      { key: "submitted", label: "Очікують перевірки", value: submitted, href: "/dashboard/expert/documents?status=SUBMITTED", description: "Зараз" },
      { key: "approved", label: "Погоджені", value: approved, href: "/dashboard/expert/documents?status=APPROVED", description: period },
      { key: "rejected", label: "Відхилені", value: rejected, href: "/dashboard/expert/documents?status=REJECTED", description: period },
      { key: "open-threads", label: "Мої відкриті зауваження", value: openThreads, href: `/dashboard/expert/comments?createdById=${encodeURIComponent(currentUserId)}`, description: "Зараз" },
      { key: "awaiting-decision", label: "Очікують мого рішення", value: awaitingDecision, href: "/dashboard/expert/comments?status=RESOLVED", description: "Зараз" },
      { key: "unread", label: "Непрочитані сповіщення", value: unread, href: "/dashboard/expert/notifications?filter=unread", description: "Зараз" },
    ],
    activity,
  };
}
