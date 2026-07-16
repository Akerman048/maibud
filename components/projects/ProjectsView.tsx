import type { Project } from "@/types/project";
import { ProjectTable } from "@/components/projects/ProjectTable";
import type { ArchiveActionState } from "@/types/archive-action";

type ExpertOption = { id: string; name: string };

export function ProjectsView({
  projects,
  baseHref = "/project",
  experts = [],
  updateProjectAction,
  archiveProjectAction,
}: {
  projects: Project[];
  baseHref?: string;
  experts?: ExpertOption[];
  archiveProjectAction?: (previousState: ArchiveActionState, formData: FormData) => Promise<ArchiveActionState>;
  updateProjectAction?: (formData: FormData) => Promise<void>;
}) {
  return <ProjectTable projects={projects} baseHref={baseHref} experts={experts} updateProjectAction={updateProjectAction} archiveProjectAction={archiveProjectAction} />;
}
