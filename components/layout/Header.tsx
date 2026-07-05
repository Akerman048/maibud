import type { ReactNode } from "react";
import { FiBell } from "react-icons/fi";

type HeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  notificationCount?: number;
};

export function Header({
  title,
  subtitle,
  action,
  notificationCount,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-[14.5px] text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {notificationCount !== undefined && (
          <button className="relative flex size-10 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white hover:bg-slate-100">
            <FiBell className="size-[19px] text-slate-600" />

            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--color-background)] bg-red-500 px-1 text-[11px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>
        )}

        {action}
      </div>
    </header>
  );
}