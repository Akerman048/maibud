import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import type { ArchiveProject } from "@/data/mockArchiveProjects";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ArchiveDetailViewProps = {
  project: ArchiveProject;
  backHref: string;
};

const checklist = [
  {
    id: "1",
    name: "Проєктна документація",
    required: true,
    archived: true,
  },
  {
    id: "2",
    name: "Експертний звіт",
    required: true,
    archived: true,
  },
  {
    id: "3",
    name: "Пояснювальна записка",
    required: true,
    archived: false,
  },
  {
    id: "4",
    name: "Кошторисна документація",
    required: false,
    archived: true,
  },
];

export function ArchiveDetailView({
  project,
  backHref,
}: ArchiveDetailViewProps) {
  return (
    <div className="flex flex-col gap-[20px]">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)] hover:text-slate-700"
      >
        <FiArrowLeft className="size-4" />
        Архів
      </Link>

      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.01em]">
              {project.name}
            </h1>

            <Badge variant={project.status === "closed" ? "success" : "warning"}>
              {project.status === "closed" ? "Комплект закрито" : "Неповний"}
            </Badge>
          </div>

          <p className="text-[14.5px] text-[var(--color-text-secondary)]">
            Документів в архіві:{" "}
            <strong className="font-semibold text-slate-700">
              {project.documentsArchived} з {project.documentsTotal}
            </strong>

            {project.overduePromises > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-red-700">
                  Прострочено обіцянок: {project.overduePromises}
                </span>
              </>
            )}
          </p>
        </div>

        <Button variant="secondary">+ Додати документ до переліку</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-semibold">Чеклист документів</h2>
        </div>

        <div>
          {checklist.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
            >
              <div>
                <div className="font-semibold">{item.name}</div>

                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {item.required ? "Обовʼязковий документ" : "Додатковий документ"}
                </div>
              </div>

              <Badge variant={item.required ? "warning" : "default"}>
                {item.required ? "Обовʼязковий" : "Додатковий"}
              </Badge>

              <Badge variant={item.archived ? "success" : "danger"}>
                {item.archived ? "В архіві" : "Відсутній"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}