import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getArchiveProjects } from "@/lib/archive";

export default async function DesignerArchivePage() {
  const archiveProjects = await getArchiveProjects();

  return (
    <DashboardLayout role="designer">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle={`${archiveProjects.length} архівні справи`}
        />

        <ArchiveView
          projects={archiveProjects}
          baseHref="/dashboard/designer/archive"
        />
      </div>
    </DashboardLayout>
  );
}