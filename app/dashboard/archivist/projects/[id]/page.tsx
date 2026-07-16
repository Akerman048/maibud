import { notFound } from "next/navigation";

import { UserRole } from "@/app/generated/prisma/client";
import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";
import { requireRole } from "@/lib/auth-guard";
import { getCommentThreadsByProjectId } from "@/lib/comment-threads";
import { getProjectAuditLogs } from "@/lib/audit";
import {
  publishDocumentToClient,
  unpublishDocumentFromClient,
} from "@/app/dashboard/head/projects/[id]/actions";
import { archiveDocument, archiveProject } from "@/app/dashboard/archive-actions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArchivistProjectDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const currentUser = await requireRole([UserRole.ARCHIVIST]);

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
        backHref="/dashboard/archivist/projects"
        auditLogs={auditLogs}
        canManageDocumentPublication
        publishDocumentAction={publishDocumentToClient}
        unpublishDocumentAction={unpublishDocumentFromClient}
        canManageArchive
        archiveProjectAction={archiveProject}
        archiveDocumentAction={archiveDocument}
      />
    </DashboardLayout>
  );
}
