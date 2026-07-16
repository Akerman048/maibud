"use client";

import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

import { Sidebar, type DashboardRole } from "./Sidebar";

import type { UserRole } from "@/app/generated/prisma/client";

type MobileSidebarProps = {
  role: DashboardRole;
  unreadNotificationCount: number;
  user: {
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
};

export function MobileSidebar({
  role,
  user,
  unreadNotificationCount,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Відкрити меню"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] lg:hidden"
      >
        <FiMenu className="size-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Закрити меню"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/45"
          />

          <div className="relative h-full w-[280px] bg-[var(--color-sidebar)]">
            <button
              type="button"
              aria-label="Закрити меню"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-300 shadow-sm transition hover:border-white/20 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FiX className="size-5" />
            </button>

            <Sidebar
              role={role}
              user={user}
              mobile
              unreadNotificationCount={unreadNotificationCount}
            />
          </div>
        </div>
      )}
    </>
  );
}
