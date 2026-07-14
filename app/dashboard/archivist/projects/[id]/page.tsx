import { notFound } from "next/navigation";

import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";
import { getCommentsByProjectId } from "@/lib/comments";
import { getProjectAuditLogs } from "@/lib/audit";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArchivistProjectDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const [project, documents, comments, auditLogs] = await Promise.all([
    getProjectById(id),
    getDocumentsByProjectId(id),
    getCommentsByProjectId(id),
    getProjectAuditLogs(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="archivist">
      <ProjectDashboardDetailView
        project={project}
        documents={documents}
        comments={comments}
        backHref="/dashboard/archivist/projects"
        auditLogs={auditLogs}
      />
    </DashboardLayout>
  );
}
