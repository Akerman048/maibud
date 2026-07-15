import Link from "next/link";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getClientProjects } from "@/lib/client-projects";

function getProjectStatusLabel(status: string) {
  if (status === "OPEN") return "Відкрито";
  if (status === "IN_PROGRESS") return "У роботі";
  if (status === "RETURNED") return "Повернуто";
  if (status === "COMPLETED") return "Завершено";
  if (status === "ARCHIVED") return "Архів";

  return status;
}

export default async function ClientDashboardPage() {
  const projects = await getClientProjects();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Мої проєкти"
          subtitle="Проєкти, доступні вашому обліковому запису"
        />

        {projects.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--color-text-secondary)]">
            Вам ще не надано доступ до проєктів.
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/client/projects/${project.id}`}
              >
                <Card className="p-5 transition hover:border-slate-300 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-[var(--color-text-primary)]">
                        {project.name}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {project.address}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Замовник: {project.customer}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="info">
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Дедлайн: {project.deadline
                          ? project.deadline.toLocaleDateString("uk-UA")
                          : "не визначено"}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
