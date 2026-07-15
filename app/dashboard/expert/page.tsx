import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getProjects } from "@/lib/projects";

export default async function ExpertPage() {
  const projects = await getProjects();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="Напрям: Газопостачання"
        />

        <ProjectsView
          projects={projects}
          baseHref="/dashboard/expert/projects"
        />
      </div>
    </DashboardLayout>
  );
}