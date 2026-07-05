import { mockProjects } from "@/data/mockProjects";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";

export default function ArchivistProjectsPage() {
  return (
    <DashboardLayout role="archivist">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          subtitle="Активні проєкти для передачі в архів"
        />

        <ProjectsView
          projects={mockProjects}
          baseHref="/dashboard/archivist/projects"
        />
      </div>
    </DashboardLayout>
  );
}