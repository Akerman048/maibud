import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiFileText } from "react-icons/fi";

import { ClientDocumentDownloadButton } from "@/components/documents/ClientDocumentDownloadButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getClientProjectById } from "@/lib/client-projects";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getProjectStatusLabel(status: string) {
  if (status === "OPEN") return "Відкрито";
  if (status === "IN_PROGRESS") return "У роботі";
  if (status === "RETURNED") return "Повернуто";
  if (status === "COMPLETED") return "Завершено";
  if (status === "ARCHIVED") return "Архів";

  return status;
}

export default async function ClientProjectPage({
  params,
}: PageProps) {
  const { id } = await params;
  const project = await getClientProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5">
        <Link
          href="/dashboard/client"
          className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)] hover:text-slate-700"
        >
          <FiArrowLeft className="size-4" />
          Назад до проєктів
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant="info">
              {getProjectStatusLabel(project.status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {project.address}
          </p>
        </div>

        <Card className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Замовник
            </div>
            <div className="mt-1 font-medium">{project.customer}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Етап
            </div>
            <div className="mt-1 font-medium">{project.stage}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Статус
            </div>
            <div className="mt-1 font-medium">
              {getProjectStatusLabel(project.status)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Дедлайн
            </div>
            <div className="mt-1 font-medium">
              {project.deadline
                ? project.deadline.toLocaleDateString("uk-UA")
                : "Не визначено"}
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Опубліковані документи
          </h2>

          {project.documents.length === 0 ? (
            <Card className="p-6 text-sm text-[var(--color-text-secondary)]">
              Опублікованих документів поки немає.
            </Card>
          ) : (
            <div className="grid gap-4">
              {project.documents.map((document) => {
                const latestVersion = document.versions[0];

                return (
                  <Card key={document.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">
                          <FiFileText className="size-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{document.title}</div>
                          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {latestVersion
                              ? `Версія ${latestVersion.version} · ${latestVersion.fileName}`
                              : "Версія ще не завантажена"}
                          </div>
                        </div>
                      </div>

                      {latestVersion && (
                        <ClientDocumentDownloadButton
                          documentId={document.id}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
