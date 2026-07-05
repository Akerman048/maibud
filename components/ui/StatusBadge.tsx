import { Badge } from "./Badge";

type ProjectStatus =
  | "open"
  | "processed"
  | "resolved"
  | "returned"
  | "overdue";

type StatusBadgeProps = {
  status: ProjectStatus;
};

const statusConfig = {
  open: {
    label: "Відкрите",
    variant: "warning",
  },

  processed: {
    label: "Відпрацьоване",
    variant: "info",
  },

  resolved: {
    label: "Знято",
    variant: "success",
  },

  returned: {
    label: "Повернуто",
    variant: "danger",
  },

  overdue: {
    label: "Прострочено",
    variant: "danger",
  },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}