import { notFound } from "next/navigation";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";
import { getDocumentsByProjectId } from "@/lib/documents";
import { getProjectById } from "@/lib/projects";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function HeadProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [project, documents] = await Promise.all([
    getProjectById(id),
    getDocumentsByProjectId(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="head">
      <ProjectDashboardDetailView
        project={project}
        documents={documents}
        backHref="/dashboard/head"
      />
    </DashboardLayout>
  );
}
