import Link from "next/link";
import { FiAlertTriangle } from "react-icons/fi";

import type { ArchiveProject } from "@/data/mockArchiveProjects";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

type ArchiveTableProps = {
  projects: ArchiveProject[];
  baseHref: string;
};

export function ArchiveTable({ projects, baseHref }: ArchiveTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="В архіві нічого не знайдено"
        description="Спробуйте змінити пошуковий запит."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white">
        <div className="grid grid-cols-[1.6fr_1.7fr_1fr_1.1fr] gap-4 border-b border-[var(--color-border)] bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
          <div>Проєкт</div>
          <div>Документи</div>
          <div>Статус</div>
          <div>Обіцянки</div>
        </div>

        {projects.map((project) => {
          const progress =
            (project.documentsArchived / project.documentsTotal) * 100;

          return (
            <Link
              key={project.id}
              href={`${baseHref}/${project.id}`}
              className="grid grid-cols-[1.6fr_1.7fr_1fr_1.1fr] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 hover:bg-slate-50"
            >
              <span className="text-[15px] font-semibold">{project.name}</span>

              <div>
                <div className="mb-1.5 flex justify-between text-[13.5px]">
                  <span className="text-[var(--color-text-secondary)]">
                    Документів
                  </span>
                  <span className="font-semibold">
                    {project.documentsArchived} з {project.documentsTotal}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className={
                      project.status === "closed"
                        ? "h-full rounded-full bg-[var(--color-success)]"
                        : "h-full rounded-full bg-[var(--color-warning)]"
                    }
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Badge
                variant={project.status === "closed" ? "success" : "warning"}
              >
                {project.status === "closed" ? "Комплект закрито" : "Неповний"}
              </Badge>

              <div>
                {project.overduePromises > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-red-700">
                    <FiAlertTriangle className="size-3.5" />
                    Прострочено: {project.overduePromises}
                  </span>
                ) : (
                  <span className="text-[13.5px] text-[var(--color-text-muted)]">
                    —
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
