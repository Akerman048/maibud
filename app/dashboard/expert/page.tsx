import { mockProjects } from "@/data/mockProjects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";

export default function ExpertPage() {
  return (
    <DashboardLayout role="expert">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="Напрям: Газопостачання · 3 активні проєкти"
        />

        <ProjectsView
          projects={mockProjects}
          baseHref="/dashboard/expert/projects"
        />
      </div>
    </DashboardLayout>
  );
}
