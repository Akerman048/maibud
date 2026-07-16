import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getProjects } from "@/lib/projects";
import { archiveProject } from "@/app/dashboard/archive-actions";

export default async function ArchivistProjectsPage() {
  const projects = await getProjects();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          subtitle="Активні проєкти для передачі в архів"
        />

        <ProjectsView
          projects={projects}
          baseHref="/dashboard/archivist/projects"
          archiveProjectAction={archiveProject}
        />
      </div>
    </DashboardLayout>
  );
}
