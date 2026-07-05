import { mockProjects } from "@/data/mockProjects";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { AddProjectButton } from "@/components/projects/AddProjectButton";
import { ProjectsView } from "@/components/projects/ProjectsView";

export default function HeadPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          notificationCount={3}
          action={<AddProjectButton />}
        />

        <ProjectsView
          projects={mockProjects}
          baseHref="/dashboard/head/projects"
        />
      </div>
    </DashboardLayout>
  );
}
