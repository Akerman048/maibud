import "server-only";

import { CommentThreadStatus, DocumentStatus, ProjectStatus } from "@/app/generated/prisma/client";
import { getActivityFeed } from "@/lib/activity-feed";
import {
  activeDocumentWhere,
  activeProjectWhere,
  getOrganizationProjectWhere,
  getSingleActiveOrganizationId,
} from "@/lib/dashboard/dashboard-scopes";
import { prisma } from "@/lib/prisma";
import type { DashboardData, DashboardDateRange } from "@/types/dashboard";

export async function getHeadDashboardData(
  currentUserId: string,
  dateRange: DashboardDateRange,
): Promise<DashboardData> {
  const organizationId = await getSingleActiveOrganizationId(currentUserId, "HEAD");
  if (!organizationId) return { stats: [], activity: [] };

  const access = getOrganizationProjectWhere(currentUserId, organizationId, "HEAD");
  const activeProject = activeProjectWhere(access);
  const activeDocument = activeDocumentWhere(activeProject);

  const [
    activeProjects,
    archivedProjects,
    documents,
    submitted,
    approved,
    rejected,
    published,
    openThreads,
    members,
    unread,
    activity,
  ] = await Promise.all([
    prisma.project.count({ where: activeProject }),
    prisma.project.count({ where: { AND: [access, { status: ProjectStatus.ARCHIVED }] } }),
    prisma.document.count({ where: activeDocument }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.SUBMITTED }] } }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.APPROVED }] } }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.REJECTED }] } }),
    prisma.document.count({ where: { AND: [activeDocument, { status: DocumentStatus.APPROVED, isPublishedToClient: true }] } }),
    prisma.commentThread.count({
      where: {
        status: { in: [CommentThreadStatus.OPEN, CommentThreadStatus.RETURNED] },
        document: activeDocument,
      },
    }),
    prisma.organizationMember.count({
      where: { organizationId, removedAt: null, user: { isActive: true } },
    }),
    prisma.notification.count({ where: { userId: currentUserId, readAt: null } }),
    getActivityFeed({ currentUserId, role: "HEAD", organizationId, dateRange }),
  ]);

  return {
    stats: [
      { key: "active-projects", label: "Активні проєкти", value: activeProjects, href: "/dashboard/head", description: "Зараз" },
      { key: "archived-projects", label: "Проєкти в архіві", value: archivedProjects, href: "/dashboard/head/archive", description: "Зараз" },
      { key: "documents", label: "Документи активних проєктів", value: documents, description: "Зараз" },
      { key: "submitted", label: "Очікують перевірки", value: submitted, description: "Зараз" },
      { key: "approved", label: "Погоджені", value: approved, description: "Зараз" },
      { key: "rejected", label: "Відхилені", value: rejected, description: "Зараз" },
      { key: "published", label: "Опубліковані клієнтам", value: published, description: "Зараз" },
      { key: "open-threads", label: "Відкриті зауваження", value: openThreads, description: "Зараз" },
      { key: "members", label: "Учасники організації", value: members, href: "/dashboard/head/members", description: "Зараз" },
      { key: "unread", label: "Непрочитані сповіщення", value: unread, href: "/dashboard/head/notifications?filter=unread", description: "Зараз" },
    ],
    activity,
  };
}
