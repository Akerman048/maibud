import { getArchiveProjects } from "@/lib/archive";
import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";

export default async function HeadArchivePage() {
  const archiveProjects = await getArchiveProjects();

  return (
    <DashboardLayout role="head">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle={`${archiveProjects.length} архівні справи`}
        />

        <ArchiveView
          projects={archiveProjects}
          baseHref="/dashboard/head/archive"
        />
      </div>
    </DashboardLayout>
  );
}
