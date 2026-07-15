import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MobileSidebar } from "./MobileSidebar";
import {
  Sidebar,
  getDashboardRole,
} from "./Sidebar";

import { auth } from "@/auth";

type DashboardLayoutProps = {
  children: ReactNode;
};

export async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = getDashboardRole(session.user.role);

  if (!role) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen bg-[var(--color-background)]">
      <div className="hidden lg:block">
        <Sidebar role={role} user={session.user} />
      </div>

      <MobileSidebar role={role} user={session.user} />

      <section className="flex-1 p-5 pt-16 lg:p-8">
        {children}
      </section>
    </main>
  );
}
