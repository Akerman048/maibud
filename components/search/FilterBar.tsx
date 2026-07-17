import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="grid w-full grid-cols-1 items-end gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 sm:grid-cols-2 lg:flex lg:flex-wrap [&>*]:min-w-0 [&_button]:w-full [&_select]:w-full sm:[&_button]:w-auto lg:[&_select]:w-auto">{children}</div>;
}
