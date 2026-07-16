import { createProject, updateProject } from "./actions";
import { archiveProject } from "@/app/dashboard/archive-actions";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { AddProjectButton } from "@/components/projects/AddProjectButton";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getDesigners, getExperts } from "@/lib/projects";
import { UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { normalizeProjectSearchParams, searchProjects } from "@/lib/project-search";
import { ProjectListControls } from "@/components/projects/ProjectListControls";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Pagination } from "@/components/search/Pagination";

export default async function HeadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [currentUser, raw] = await Promise.all([requireRole([UserRole.HEAD]), searchParams]);
  const query = normalizeProjectSearchParams(raw, currentUser.id, currentUser.role);
  const [result, experts, designers] = await Promise.all([searchProjects(query), getExperts(currentUser.id), getDesigners(currentUser.id)]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Проєкти"
          action={
            <AddProjectButton
              experts={experts}
              createProjectAction={createProject}
            />
          }
        />

        <ProjectListControls query={Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))} basePath="/dashboard/head" experts={experts} designers={designers} />
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <ProjectsView
          projects={result.items}
          baseHref="/dashboard/head/projects"
          experts={experts}
          updateProjectAction={updateProject}
          archiveProjectAction={archiveProject}
        />
        <Pagination pagination={result.pagination} />
      </div>
    </DashboardLayout>
  );
}
