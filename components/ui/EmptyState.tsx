import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-8 text-center">
      <h3 className="font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-[360px] text-sm text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}