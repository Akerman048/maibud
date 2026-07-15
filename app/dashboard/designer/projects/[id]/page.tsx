import { notFound } from "next/navigation";

import { UserRole } from "@/app/generated/prisma/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getProjectAuditLogs } from "@/lib/audit";
import { requireRole } from "@/lib/auth-guard";
import { getCommentThreadsByProjectId } from "@/lib/comment-threads";
import { getDocumentsByProjectId } from "@/lib/documents";
import { getProjectById } from "@/lib/projects";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DesignerProjectDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const currentUser = await requireRole([UserRole.DESIGNER]);

  const [project, documents, commentThreads, auditLogs] = await Promise.all([
    getProjectById(id),
    getDocumentsByProjectId(id),
    getCommentThreadsByProjectId(id, currentUser.id, currentUser.role),
    getProjectAuditLogs(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout>
      <ProjectDashboardDetailView
        project={project}
        documents={documents}
        commentThreads={commentThreads}
        auditLogs={auditLogs}
        backHref="/dashboard/designer"
        commentThreadBaseHref="/dashboard/designer/comments"
        canUploadDocumentVersion
      />
    </DashboardLayout>
  );
}
