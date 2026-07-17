"use client";

type TabItem = {
  label: string;
  value: string;
  count?: number;
};

type TabsProps = {
  items: TabItem[];
  activeValue: string;
  onChange?: (value: string) => void;
};

export function Tabs({ items, activeValue, onChange }: TabsProps) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto border-b border-[var(--color-border)]">
      {items.map((item) => {
        const isActive = item.value === activeValue;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange?.(item.value)}
            className={`
              min-h-11 shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition
              ${
                isActive
                  ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }
            `}
          >
            {item.label}

            {item.count !== undefined && (
              <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
