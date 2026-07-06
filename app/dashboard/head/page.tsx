import { archiveProject, createProject, updateProject } from "./actions";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { AddProjectButton } from "@/components/projects/AddProjectButton";
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
          experts={experts}
          updateProjectAction={updateProject}
          archiveProjectAction={archiveProject}
        />
      </div>
    </DashboardLayout>
  );
}