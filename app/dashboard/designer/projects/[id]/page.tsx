import { notFound } from "next/navigation";

import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";
import { getCommentsByProjectId } from "@/lib/comments";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DesignerProjectDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

const [project, documents, comments] = await Promise.all([
  getProjectById(id),
  getDocumentsByProjectId(id),
  getCommentsByProjectId(id),
]);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="designer">
      <ProjectDashboardDetailView
        project={project}
        documents={documents}
        comments={comments}
        backHref="/dashboard/designer"
      />
    </DashboardLayout>
  );
}