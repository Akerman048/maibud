import { notFound } from "next/navigation";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getProjectAuditLogs } from "@/lib/audit";
import { getCommentsByProjectId } from "@/lib/comments";
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
    <DashboardLayout>
      <ProjectDashboardDetailView
  project={project}
  documents={documents}
  comments={comments}
  auditLogs={auditLogs}
  backHref="/dashboard/designer"
  canUploadDocumentVersion
/>
    </DashboardLayout>
  );
}