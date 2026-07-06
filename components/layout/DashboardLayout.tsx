import type { ReactNode } from "react";

import { MobileSidebar } from "./MobileSidebar";
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
      <div className="hidden lg:block">
        <Sidebar role={role} />
      </div>

      <MobileSidebar role={role} />

      <section className="flex-1 p-5 pt-16 lg:p-8">
        {children}
      </section>
    </main>
  );
}