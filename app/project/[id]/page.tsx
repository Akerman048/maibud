import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { ProjectInfoGrid } from "@/components/projects/ProjectInfoGrid";
import { ProjectPublicDocuments } from "@/components/projects/ProjectPublicDocuments";
import { ProjectStepper } from "@/components/projects/ProjectStepper";
import { getProjectAuditLogs } from "@/lib/audit";
import { getProjectById } from "@/lib/projects";
import { BRAND_NAME } from "@/lib/brand";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [project, auditLogs] = await Promise.all([
    getProjectById(id),
    getProjectAuditLogs(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] p-4 sm:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-[7px] bg-[var(--color-accent)] text-sm font-bold text-white">
            E
          </div>

          <span className="text-[15px] font-bold">{BRAND_NAME}</span>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">
            Статус експертизи вашого проєкту
          </div>

          <h1 className="break-words text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
            {project.name}
          </h1>

          <p className="mt-1 break-words text-[var(--color-text-secondary)]">
            {project.address}
          </p>
        </div>

        <Card className="p-5 sm:p-8">
          <ProjectStepper currentStep={3} />
        </Card>

        <Card className="p-4 sm:p-6">
          <ProjectInfoGrid project={project} />
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold">Останні оновлення</h2>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Подій поки немає.
            </p>
          ) : (
            <div className="flex flex-col">
              {auditLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className="border-b border-[var(--color-border)] py-4 last:border-b-0"
                >
                  <div className="font-semibold">{log.action}</div>

                  {log.documentTitle && (
                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      Документ: {log.documentTitle}
                    </div>
                  )}

                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {log.createdAt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold">Документи</h2>
          <ProjectPublicDocuments />
        </Card>
      </div>
    </main>
  );
}
