import { mockProjects } from "@/data/mockProjects";

import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { mockArchiveProjects } from "@/data/mockArchiveProjects";

export default function ArchivistPage() {
  return (
    <DashboardLayout role="archivist">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle="Документи, справи та завершені проєкти"
          notificationCount={4}
        />
        <ArchiveView
          projects={mockArchiveProjects}
          baseHref="/dashboard/archivist/archive"
        />{" "}
      </div>
    </DashboardLayout>
  );
}
