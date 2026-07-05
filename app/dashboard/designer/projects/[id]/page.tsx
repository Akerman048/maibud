import { notFound } from "next/navigation";

import { mockProjects } from "@/data/mockProjects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DesignerProjectDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const project = mockProjects.find((project) => project.id === id);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="designer">
      <ProjectDashboardDetailView
        project={project}
        backHref="/dashboard/designer"
      />
    </DashboardLayout>
  );
}