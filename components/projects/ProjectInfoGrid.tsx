import type { Project } from "@/types/project";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ProjectInfoGridProps = {
  project: Project;
};

export function ProjectInfoGrid({ project }: ProjectInfoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div>
        <div className="text-sm text-[var(--color-text-muted)]">Замовник</div>
        <div className="mt-1 font-semibold">{project.customer}</div>
      </div>

      <div>
        <div className="text-sm text-[var(--color-text-muted)]">Етап</div>
        <div className="mt-1 font-semibold">{project.stage}</div>
      </div>

      <div>
        <div className="text-sm text-[var(--color-text-muted)]">Експерт</div>
        <div className="mt-1 font-semibold">{project.expert}</div>
      </div>

      <div>
        <div className="text-sm text-[var(--color-text-muted)]">Дедлайн</div>
        <div className="mt-1 font-semibold">{project.deadline}</div>
      </div>

      <div>
        <div className="text-sm text-[var(--color-text-muted)]">Статус</div>
        <div className="mt-2">
          <StatusBadge status={project.status} />
        </div>
      </div>
    </div>
  );
}