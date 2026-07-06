import { FiDownload, FiFileText } from "react-icons/fi";

import type { DocumentItem } from "@/types/document";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type DocumentsViewProps = {
  documents: DocumentItem[];
};

function getStatusLabel(status: DocumentItem["status"]) {
  if (status === "draft") return "Чернетка";
  if (status === "submitted") return "На перевірці";
  if (status === "approved") return "Готово";
  if (status === "rejected") return "Відхилено";
  if (status === "archived") return "Архів";

  return "Невідомо";
}

function getStatusVariant(status: DocumentItem["status"]) {
  if (status === "approved") return "success";
  if (status === "submitted") return "info";
  if (status === "rejected") return "danger";
  if (status === "archived") return "default";

  return "warning";
}

export function DocumentsView({ documents }: DocumentsViewProps) {
  return (
    <div className="grid gap-4">
      {documents.map((document) => (
        <Card key={document.id} className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-[var(--radius-lg)] bg-slate-100 text-[var(--color-text-secondary)]">
                <FiFileText className="size-5" />
              </div>

              <div>
                <div className="font-semibold">{document.name}</div>

                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {document.project} · {document.type}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={getStatusVariant(document.status)}>
                {getStatusLabel(document.status)}
              </Badge>

              <button className="flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white hover:bg-slate-50">
                <FiDownload className="size-4 text-[var(--color-text-secondary)]" />
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}