import Link from "next/link";
import type { Project } from "@/types/project";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectRowActions } from "@/components/projects/ProjectRowActions";
import { Table } from "../ui/Table";
import type { ArchiveActionState } from "@/types/archive-action";

type ExpertOption = {
  id: string;
  name: string;
};

type ProjectTableProps = {
  projects: Project[];
  baseHref?: string;
  experts?: ExpertOption[];
  updateProjectAction?: (formData: FormData) => Promise<void>;
  archiveProjectAction?: (
    previousState: ArchiveActionState,
    formData: FormData,
  ) => Promise<ArchiveActionState>;
};

export function ProjectTable({
  projects,
  baseHref = "/project",
  experts = [],
  updateProjectAction,
  archiveProjectAction,
}: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Проєкти не знайдено"
        description="Спробуйте змінити пошуковий запит або фільтр."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {projects.map((project) => (
          <article key={project.id} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`${baseHref}/${project.id}`} className="break-words font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
                  {project.name}
                </Link>
                <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">{project.address}</p>
              </div>
              <ProjectRowActions
                project={project}
                baseHref={baseHref}
                experts={experts}
                updateProjectAction={updateProjectAction}
                archiveProjectAction={archiveProjectAction}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm min-[390px]:grid-cols-2">
              <div className="min-w-0"><span className="text-[var(--color-text-muted)]">Замовник</span><p className="break-words font-medium">{project.customer}</p></div>
              <div className="min-w-0"><span className="text-[var(--color-text-muted)]">Етап</span><p className="break-words">{project.stage}</p></div>
              <div className="min-w-0"><span className="text-[var(--color-text-muted)]">Експерт</span><p className="break-words">{project.expert}</p></div>
              <div><span className="text-[var(--color-text-muted)]">Дедлайн</span><p className="font-medium">{project.deadline}</p></div>
            </div>
            <div className="mt-4"><StatusBadge status={project.status} /></div>
          </article>
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
      <div className="min-w-[980px]">
        <Table>
          <thead className="bg-slate-50">
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Проєкт
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Замовник
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Етап
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Експерт
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Дедлайн
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Статус
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Дії
              </th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  <Link
                    href={`${baseHref}/${project.id}`}
                    className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                  >
                    {project.name}
                  </Link>

                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {project.address}
                  </div>
                </td>

                <td className="px-5 py-4 text-sm text-[var(--color-text-primary)]">
                  {project.customer}
                </td>

                <td className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
                  {project.stage}
                </td>

                <td className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
                  {project.expert}
                </td>

                <td className="px-5 py-4 text-sm font-medium text-[var(--color-text-primary)]">
                  {project.deadline}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <ProjectRowActions
                    project={project}
                    baseHref={baseHref}
                    experts={experts}
                    updateProjectAction={updateProjectAction}
                    archiveProjectAction={archiveProjectAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      </div>
    </>
  );
}
