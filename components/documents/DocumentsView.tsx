import { FiDownload, FiFileText } from "react-icons/fi";

import type { DocumentItem } from "@/types/document";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getDocumentStatusMeta } from "@/lib/document-status";
import { EmptyState } from "@/components/ui/EmptyState";

type DocumentsViewProps = {
  documents: DocumentItem[];
};

export function DocumentsView({ documents }: DocumentsViewProps) {
  if (documents.length === 0) return <EmptyState title="Документи не знайдено" description="Спробуйте змінити пошуковий запит або фільтри." />;
  return (
    <div className="grid gap-4">
      {documents.map((document) => {
        const statusMeta = getDocumentStatusMeta(document.status);

        return (
          <Card key={document.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-slate-100 text-[var(--color-text-secondary)]">
                  <FiFileText className="size-5" />
                </div>

                <div>
                  <div className="font-semibold">{document.name}</div>

                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {document.project} · {document.type} · {document.latestVersion
                      ? `v${document.latestVersion}`
                      : "версій немає"}
                  </div>

                  {document.reviewedByName && document.reviewedAt && (
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Перевірив: {document.reviewedByName} · {document.reviewedAt}
                    </div>
                  )}

                  {document.status === "rejected" &&
                    document.rejectionReason && (
                      <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                        {document.rejectionReason}
                      </div>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={statusMeta.variant}>
                  {statusMeta.label}
                </Badge>

                <button className="flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white hover:bg-slate-50">
                  <FiDownload className="size-4 text-[var(--color-text-secondary)]" />
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
