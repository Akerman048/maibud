import { createProject } from "@/app/dashboard/head/actions";
import { AddProjectButton } from "@/components/projects/AddProjectButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getExperts, getProjects } from "@/lib/projects";

export default async function HeadPage() {
  const projects = await getProjects();
  const experts = await getExperts();

  return (
    <DashboardLayout role="head">
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          notificationCount={3}
          action={
            <AddProjectButton
              experts={experts}
              createProjectAction={createProject}
            />
          }
        />

        <ProjectsView
          projects={projects}
          baseHref="/dashboard/head/projects"
        />
      </div>
    </DashboardLayout>
  );
}