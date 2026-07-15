import { FiLogOut } from "react-icons/fi";

import { SidebarNav } from "./SidebarNav";

import type { UserRole } from "@/app/generated/prisma/client";
import { logout } from "@/app/dashboard/actions";

export type DashboardRole = "head" | "expert" | "designer" | "archivist";

type SidebarProps = {
  role: DashboardRole;
  user: {
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
};

const dashboardRoleByUserRole: Partial<Record<UserRole, DashboardRole>> = {
  HEAD: "head",
  EXPERT: "expert",
  DESIGNER: "designer",
  ARCHIVIST: "archivist",
};

export function getDashboardRole(role: UserRole) {
  return dashboardRoleByUserRole[role] ?? null;
}

function getInitials(name: string | null | undefined) {
  if (!name) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Sidebar({ role, user }: SidebarProps) {
  const initials = getInitials(user.name);

  return (
    <aside className="flex min-h-screen w-[248px] shrink-0 flex-col bg-[var(--color-sidebar)] px-3 py-5">
      <div className="mb-4 flex items-center gap-2.5 border-b border-white/10 px-3 pb-5">
        <div className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-base font-bold text-white">
          E
        </div>

        <span className="text-[17px] font-bold text-white">ExpertDesk</span>
      </div>

      <SidebarNav role={role} />

      <div className="flex items-center gap-2.5 rounded-[10px] bg-white/5 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {user.name ?? "Користувач"}
          </div>

          <div className="truncate text-[12.5px] text-[var(--color-text-muted)]">
            {user.email ?? "Email не вказано"}
          </div>

          <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {user.role}
          </div>
        </div>
      </div>

      <form action={logout} className="mt-2">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <FiLogOut className="size-4" />
          Вийти
        </button>
      </form>
    </aside>
  );
}
