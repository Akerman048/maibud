import { FiFileText } from "react-icons/fi";
import { Badge } from "@/components/ui/Badge";

const publicDocuments = [
  {
    id: "1",
    name: "Проєктна документація",
    status: "Перевіряється",
  },
  {
    id: "2",
    name: "Експертний звіт",
    status: "Очікується",
  },
  {
    id: "3",
    name: "Пояснювальна записка",
    status: "Прийнято",
  },
];

export function ProjectPublicDocuments() {
  return (
    <div className="grid gap-3">
      {publicDocuments.map((document) => (
        <div
          key={document.id}
          className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-slate-100 text-[var(--color-text-secondary)]">
              <FiFileText className="size-4" />
            </div>

            <span className="font-semibold">{document.name}</span>
          </div>

          <Badge
            variant={
              document.status === "Прийнято"
                ? "success"
                : document.status === "Перевіряється"
                  ? "info"
                  : "default"
            }
          >
            {document.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}