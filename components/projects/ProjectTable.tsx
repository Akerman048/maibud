import Link from "next/link";
import type { Project } from "@/data/mockProjects";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectRowActions } from "@/components/projects/ProjectRowActions";
import { Table } from "../ui/Table";

type ExpertOption = {
  id: string;
  name: string;
};

type ProjectTableProps = {
  projects: Project[];
  baseHref?: string;
  experts?: ExpertOption[];
  updateProjectAction?: (formData: FormData) => Promise<void>;
};

export function ProjectTable({
  projects,
  baseHref = "/project",
  experts = [],
  updateProjectAction,
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
    <div className="overflow-x-auto">
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
/>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
