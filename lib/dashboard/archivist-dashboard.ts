import "server-only";

import { DocumentStatus, ProjectStatus } from "@/app/generated/prisma/client";
import { getActivityFeed } from "@/lib/activity-feed";
import { getDashboardDateRangeStart, getDashboardPeriodDescription } from "@/lib/dashboard-date-range";
import {
  activeDocumentWhere,
  activeProjectWhere,
  getOrganizationProjectWhere,
  getSingleActiveOrganizationId,
} from "@/lib/dashboard/dashboard-scopes";
import { prisma } from "@/lib/prisma";
import type { DashboardData, DashboardDateRange } from "@/types/dashboard";

export async function getArchivistDashboardData(
  currentUserId: string,
  dateRange: DashboardDateRange,
): Promise<DashboardData> {
  const organizationId = await getSingleActiveOrganizationId(currentUserId, "ARCHIVIST");
  if (!organizationId) return { stats: [], activity: [] };

  const access = getOrganizationProjectWhere(currentUserId, organizationId, "ARCHIVIST");
  const activeProject = activeProjectWhere(access);
  const activeDocument = activeDocumentWhere(activeProject);
  const rangeStart = getDashboardDateRangeStart(dateRange, new Date());
  const period = getDashboardPeriodDescription(dateRange);

  const [activeProjects, archivedProjects, archivedDocuments, published, documentsArchivedPeriod, projectsArchivedPeriod, unread, activity] = await Promise.all([
    prisma.project.count({ where: activeProject }),
    prisma.project.count({ where: { AND: [access, { status: ProjectStatus.ARCHIVED }] } }),
    prisma.document.count({ where: { status: DocumentStatus.ARCHIVED, project: access } }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.APPROVED, isPublishedToClient: true }] } }),
    prisma.document.count({
      where: {
        status: DocumentStatus.ARCHIVED,
        project: access,
        ...(rangeStart ? { archivedAt: { gte: rangeStart } } : { archivedAt: { not: null } }),
      },
    }),
    prisma.project.count({
      where: {
        AND: [access, { status: ProjectStatus.ARCHIVED }],
        ...(rangeStart ? { archivedAt: { gte: rangeStart } } : { archivedAt: { not: null } }),
      },
    }),
    prisma.notification.count({ where: { userId: currentUserId, readAt: null } }),
    getActivityFeed({ currentUserId, role: "ARCHIVIST", organizationId, dateRange }),
  ]);

  return {
    stats: [
      { key: "active-projects", label: "Активні проєкти", value: activeProjects, href: "/dashboard/archivist/projects", description: "Зараз" },
      { key: "archived-projects", label: "Архівовані проєкти", value: archivedProjects, href: "/dashboard/archivist", description: "Зараз" },
      { key: "archived-documents", label: "Архівовані документи", value: archivedDocuments, href: "/dashboard/archivist", description: "Зараз" },
      { key: "published", label: "Опубліковані клієнтам", value: published, href: "/dashboard/archivist/projects", description: "Зараз" },
      { key: "documents-archived-period", label: "Документи передано в архів", value: documentsArchivedPeriod, href: "/dashboard/archivist", description: period },
      { key: "projects-archived-period", label: "Проєкти передано в архів", value: projectsArchivedPeriod, href: "/dashboard/archivist", description: period },
      { key: "unread", label: "Непрочитані сповіщення", value: unread, href: "/dashboard/archivist/notifications?filter=unread", description: "Зараз" },
    ],
    activity,
  };
}
