"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

import { Sidebar, type DashboardRole } from "./Sidebar";

import type { UserRole } from "@/app/generated/prisma/client";

type MobileSidebarProps = {
  role: DashboardRole;
  unreadNotificationCount: number;
  openCommentThreadCount: number;
  archiveCount: number;
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
  openCommentThreadCount,
  archiveCount,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Відкрити меню"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] lg:hidden"
      >
        <FiMenu className="size-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Закрити меню"
            onClick={closeMenu}
            className="absolute inset-0 bg-slate-950/45"
          />

          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Навігаційне меню"
            className="relative h-[100dvh] w-[min(288px,calc(100vw-16px))] overflow-y-auto overscroll-contain bg-[var(--color-sidebar)]"
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Закрити меню"
              onClick={closeMenu}
              className="absolute right-3 top-4 z-20 flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-300 shadow-sm transition hover:border-white/20 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FiX className="size-5" />
            </button>

            <Sidebar
              role={role}
              user={user}
              mobile
              onNavigate={closeMenu}
              unreadNotificationCount={unreadNotificationCount}
              openCommentThreadCount={openCommentThreadCount}
              archiveCount={archiveCount}
            />
          </div>
        </div>
      )}
    </>
  );
}
