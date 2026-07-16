import "server-only";

import { CommentThreadStatus, DocumentStatus } from "@/app/generated/prisma/client";
import { getActivityFeed } from "@/lib/activity-feed";
import { getDashboardDateRangeStart, getDashboardPeriodDescription } from "@/lib/dashboard-date-range";
import { activeDocumentWhere, activeProjectWhere, getAssignedProjectWhere, hasActiveRole } from "@/lib/dashboard/dashboard-scopes";
import { prisma } from "@/lib/prisma";
import type { DashboardData, DashboardDateRange } from "@/types/dashboard";

export async function getDesignerDashboardData(
  currentUserId: string,
  dateRange: DashboardDateRange,
): Promise<DashboardData> {
  if (!(await hasActiveRole(currentUserId, "DESIGNER"))) {
    return { stats: [], activity: [] };
  }

  const activeProject = activeProjectWhere(getAssignedProjectWhere(currentUserId, "DESIGNER"));
  const activeDocument = activeDocumentWhere(activeProject);
  const ownDocument = { AND: [activeDocument, { authorId: currentUserId }] };
  const rangeStart = getDashboardDateRangeStart(dateRange, new Date());

  const [projects, documents, submitted, approved, rejected, openThreads, versions, unread, activity] = await Promise.all([
    prisma.project.count({ where: activeProject }),
    prisma.document.count({ where: ownDocument }),
    prisma.document.count({ where: { AND: [ownDocument, { status: DocumentStatus.SUBMITTED }] } }),
    prisma.document.count({ where: { AND: [ownDocument, { status: DocumentStatus.APPROVED }] } }),
    prisma.document.count({ where: { AND: [ownDocument, { status: DocumentStatus.REJECTED }] } }),
    prisma.commentThread.count({
      where: {
        status: { in: [CommentThreadStatus.OPEN, CommentThreadStatus.RETURNED] },
        document: activeDocument,
      },
    }),
    prisma.documentVersion.count({
      where: {
        createdById: currentUserId,
        ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),
        document: activeDocument,
      },
    }),
    prisma.notification.count({ where: { userId: currentUserId, readAt: null } }),
    getActivityFeed({ currentUserId, role: "DESIGNER", dateRange }),
  ]);

  return {
    stats: [
      { key: "projects", label: "Призначені проєкти", value: projects, href: "/dashboard/designer", description: "Зараз" },
      { key: "documents", label: "Мої документи", value: documents, href: `/dashboard/designer/documents?authorId=${encodeURIComponent(currentUserId)}`, description: "Зараз" },
      { key: "submitted", label: "Подані на перевірку", value: submitted, href: `/dashboard/designer/documents?status=SUBMITTED&authorId=${encodeURIComponent(currentUserId)}`, description: "Зараз" },
      { key: "approved", label: "Погоджені", value: approved, href: `/dashboard/designer/documents?status=APPROVED&authorId=${encodeURIComponent(currentUserId)}`, description: "Зараз" },
      { key: "rejected", label: "Потребують виправлення", value: rejected, href: `/dashboard/designer/documents?status=REJECTED&authorId=${encodeURIComponent(currentUserId)}`, description: "Зараз" },
      { key: "open-threads", label: "Відкриті зауваження", value: openThreads, href: "/dashboard/designer/comments", description: "Зараз" },
      { key: "versions", label: "Нові версії", value: versions, href: "/dashboard/designer/documents", description: getDashboardPeriodDescription(dateRange) },
      { key: "unread", label: "Непрочитані сповіщення", value: unread, href: "/dashboard/designer/notifications?filter=unread", description: "Зараз" },
    ],
    activity,
  };
}
