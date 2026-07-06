import { notFound } from "next/navigation";

import { getProjectById } from "@/lib/projects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectDashboardDetailView } from "@/components/projects/ProjectDashboardDetailView";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArchivistProjectDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="archivist">
      <ProjectDashboardDetailView
        project={project}
        backHref="/dashboard/archivist/projects"
      />
    </DashboardLayout>
  );
}