"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";

import { ArchiveActionDialog } from "@/components/archive/ArchiveActionDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ArchiveActionState } from "@/types/archive-action";
import type { ArchiveProjectDetail } from "@/types/archive";

type ArchiveAction = (
  previousState: ArchiveActionState,
  formData: FormData,
) => Promise<ArchiveActionState>;

export function ArchiveDetailView({
  project,
  backHref,
  canManage = false,
  restoreProjectAction,
  restoreDocumentAction,
}: {
  project: ArchiveProjectDetail;
  backHref: string;
  canManage?: boolean;
  restoreProjectAction?: ArchiveAction;
  restoreDocumentAction?: ArchiveAction;
}) {
  const [restoreProjectOpen, setRestoreProjectOpen] = useState(false);
  const [restoreDocumentId, setRestoreDocumentId] = useState<string | null>(null);
  const restoreDocument = project.documents.find(({ id }) => id === restoreDocumentId);

  return (
    <div className="flex flex-col gap-5">
      <Link href={backHref} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--color-text-secondary)] hover:text-slate-700">
        <FiArrowLeft className="size-4" /> Архів
      </Link>

      <div className="flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="break-words text-xl font-bold sm:text-2xl">{project.name}</h1>
            <Badge variant={project.status === "ARCHIVED" ? "warning" : "default"}>
              {project.status === "ARCHIVED" ? "Архівний проєкт" : "Активний проєкт"}
            </Badge>
          </div>
          <p className="mt-2 break-words text-sm text-[var(--color-text-secondary)]">{project.address} · {project.customer}</p>
        </div>
        {canManage && project.status === "ARCHIVED" && restoreProjectAction ? (
          <Button type="button" onClick={() => setRestoreProjectOpen(true)} className="w-full sm:w-auto">Відновити проєкт</Button>
        ) : null}
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div><div className="text-xs text-[var(--color-text-muted)]">Архівовано</div><div className="mt-1 text-sm font-semibold">{project.archivedAt ? new Date(project.archivedAt).toLocaleString("uk-UA") : "—"}</div></div>
          <div><div className="text-xs text-[var(--color-text-muted)]">Ким</div><div className="mt-1 text-sm font-semibold">{project.archivedByName ?? "—"}</div></div>
          <div><div className="text-xs text-[var(--color-text-muted)]">Попередній статус</div><div className="mt-1 text-sm font-semibold">{project.previousStatus ?? "—"}</div></div>
        </div>
        {project.archiveReason ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm">{project.archiveReason}</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-semibold">Документи</h2>
        </div>
        {project.documents.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-text-secondary)]">Архівних документів немає.</p>
        ) : project.documents.map((document) => (
          <div key={document.id} className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 md:flex-row md:items-start">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="break-words font-semibold">{document.name}</span>
                <Badge variant={document.status === "ARCHIVED" ? "warning" : "default"}>{document.status}</Badge>
              </div>
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                Архівував: {document.archivedByName ?? "—"} · {document.archivedAt ? new Date(document.archivedAt).toLocaleString("uk-UA") : "—"}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">Попередній статус: {document.previousStatus ?? "—"}</div>
              {document.restoredAt ? (
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Відновлено: {new Date(document.restoredAt).toLocaleString("uk-UA")} · {document.restoredByName ?? "—"}
                </div>
              ) : null}
              {document.archiveReason ? <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">{document.archiveReason}</p> : null}
            </div>
            {canManage && project.status !== "ARCHIVED" && document.status === "ARCHIVED" && restoreDocumentAction ? (
              <Button type="button" variant="secondary" onClick={() => setRestoreDocumentId(document.id)}>Відновити документ</Button>
            ) : null}
          </div>
        ))}
      </Card>

      {restoreProjectOpen && restoreProjectAction ? (
        <ArchiveActionDialog action={restoreProjectAction} entity="project" entityId={project.id} entityName={project.name} mode="restore" onClose={() => setRestoreProjectOpen(false)} />
      ) : null}
      {restoreDocument && restoreDocumentAction ? (
        <ArchiveActionDialog action={restoreDocumentAction} entity="document" entityId={restoreDocument.id} entityName={restoreDocument.name} mode="restore" onClose={() => setRestoreDocumentId(null)} />
      ) : null}
    </div>
  );
}
