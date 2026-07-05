import { mockArchiveProjects } from "@/data/mockArchiveProjects";

import { ArchiveView } from "@/components/archive/ArchiveView";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";

export default function HeadArchivePage() {
  return (
    <DashboardLayout role="head">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Архів"
          subtitle={`${mockArchiveProjects.length} архівні справи`}
        />
        <ArchiveView
          projects={mockArchiveProjects}
          baseHref="/dashboard/head/archive"
        />{" "}
      </div>
    </DashboardLayout>
  );
}
