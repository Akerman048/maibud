import type { ReactNode } from "react";
import { Sidebar, type DashboardRole } from "./Sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
  role?: DashboardRole;
};

export function DashboardLayout({
  children,
  role = "head",
}: DashboardLayoutProps) {
  return (
    <main className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar role={role} />

      <section className="flex-1 p-8">{children}</section>
    </main>
  );
}