import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { getArchiveProjects } from "@/lib/archive";

export default async function ArchivistPage() {
  const archiveProjects = await getArchiveProjects();

  return (
    <DashboardLayout role="archivist">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle="Документи, справи та комплектність архіву"
          notificationCount={4}
        />

        <ArchiveView
          projects={archiveProjects}
          baseHref="/dashboard/archivist/archive"
        />
      </div>
    </DashboardLayout>
  );
}