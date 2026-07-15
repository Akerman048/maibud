import { notFound } from "next/navigation";

import { getProjectAuditLogs } from "@/lib/audit";
import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";
import { getCommentsByProjectId } from "@/lib/comments";
import { createComment } from "./actions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExpertProjectDetailPage({ params }: PageProps) {
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
        backHref="/dashboard/expert"
        createCommentAction={createComment}
      />
    </DashboardLayout>
  );
}
