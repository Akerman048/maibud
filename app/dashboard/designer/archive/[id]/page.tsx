import { notFound } from "next/navigation";

import { mockArchiveProjects } from "@/data/mockArchiveProjects";
import { ArchiveDetailView } from "@/components/archive/ArchiveDetailView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DesignerArchiveDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const project = mockArchiveProjects.find(
    (project) => project.id === id,
  );

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout role="designer">
      <ArchiveDetailView
        project={project}
        backHref="/dashboard/designer/archive"
      />
    </DashboardLayout>
  );
}