import { notFound } from "next/navigation";

import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExpertProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

const [project, documents] = await Promise.all([
  getProjectById(id),
  getDocumentsByProjectId(id),
]);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="expert">
      <ProjectDashboardDetailView
        project={project}
        documents={documents}
        backHref="/dashboard/expert"
      />
    </DashboardLayout>
  );
}
