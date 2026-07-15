import { notFound } from "next/navigation";

import { ArchiveDetailView } from "@/components/archive/ArchiveDetailView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getArchiveProjectById } from "@/lib/archive";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArchivistArchiveDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const project = await getArchiveProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout>
      {" "}
      <ArchiveDetailView project={project} backHref="/dashboard/designer/archive" />
    </DashboardLayout>
  );
}
