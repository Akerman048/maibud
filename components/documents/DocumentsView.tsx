import { FiDownload, FiFileText } from "react-icons/fi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import { mockDocuments } from "@/data/mockDocuments";

export function DocumentsView() {
  return (
    <div className="grid gap-4">
      {mockDocuments.map((document) => (
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
              <Badge
                variant={
                  document.status === "Актуальна" || document.status === "Готово"
                    ? "success"
                    : "warning"
                }
              >
                {document.status}
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