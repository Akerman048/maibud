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
    <header className="flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-bold tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-2xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 break-words text-[14.5px] text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:shrink-0">
        {notificationCount !== undefined && (
          <button aria-label="Сповіщення" className="relative flex size-11 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-white hover:bg-slate-100">
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
