import type { DocumentStatus } from "@/types/document";

type DocumentStatusVariant =
  | "default"
  | "warning"
  | "info"
  | "success"
  | "danger";

const documentStatusMeta: Record<
  DocumentStatus,
  {
    label: string;
    variant: DocumentStatusVariant;
  }
> = {
  draft: {
    label: "Чернетка",
    variant: "warning",
  },
  submitted: {
    label: "На перевірці",
    variant: "info",
  },
  approved: {
    label: "Погоджено",
    variant: "success",
  },
  rejected: {
    label: "Відхилено",
    variant: "danger",
  },
  archived: {
    label: "Архів",
    variant: "default",
  },
};

export function getDocumentStatusMeta(status: DocumentStatus) {
  return documentStatusMeta[status];
}
