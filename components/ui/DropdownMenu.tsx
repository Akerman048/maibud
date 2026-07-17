"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";

type DropdownMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type DropdownMenuProps = {
  items: DropdownMenuItem[];
  trigger?: ReactNode;
};

export function DropdownMenu({ items, trigger }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label="Відкрити меню дій"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-slate-50"
      >
        {trigger ?? <FiMoreHorizontal className="size-5" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-20 w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`block min-h-11 w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-50 ${
                item.danger
                  ? "text-red-600"
                  : "text-[var(--color-text-primary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
