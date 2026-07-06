import { AddProjectButton } from "@/components/projects/AddProjectButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getProjects } from "@/lib/projects";

export default async function HeadPage() {
  const projects = await getProjects();

  return (
    <DashboardLayout role="head">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          notificationCount={3}
          action={<AddProjectButton />}
        />

        <ProjectsView
          projects={projects}
          baseHref="/dashboard/head/projects"
        />
      </div>
    </DashboardLayout>
  );
}