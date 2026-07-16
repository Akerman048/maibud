import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ArchiveProject } from "@/types/archive";

export function ArchiveTable({
  projects,
  baseHref,
}: {
  projects: ArchiveProject[];
  baseHref: string;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="В архіві нічого не знайдено"
        description="Спробуйте змінити пошук або фільтри."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white">
      <table className="min-w-[900px] w-full text-left">
        <thead className="bg-slate-50 text-xs uppercase text-[var(--color-text-muted)]">
          <tr>
            <th className="px-5 py-3">Проєкт</th>
            <th className="px-5 py-3">Стан</th>
            <th className="px-5 py-3">Документи</th>
            <th className="px-5 py-3">Архівував</th>
            <th className="px-5 py-3">Дата</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-5 py-4">
                <Link href={`${baseHref}/${project.id}`} className="font-semibold hover:text-[var(--color-accent)]">
                  {project.name}
                </Link>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {project.address} · {project.customer}
                </div>
              </td>
              <td className="px-5 py-4">
                <Badge variant={project.status === "ARCHIVED" ? "warning" : "default"}>
                  {project.status === "ARCHIVED" ? "Проєкт в архіві" : "Архівні документи"}
                </Badge>
              </td>
              <td className="px-5 py-4 text-sm">
                {project.documentsArchived} з {project.documentsTotal}
              </td>
              <td className="px-5 py-4 text-sm">
                {project.archivedByName ?? "—"}
              </td>
              <td className="px-5 py-4 text-sm">
                {project.archivedAt
                  ? new Date(project.archivedAt).toLocaleDateString("uk-UA")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
