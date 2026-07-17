import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MobileSidebar } from "./MobileSidebar";
import {
  Sidebar,
  getDashboardRole,
} from "./Sidebar";

import { auth } from "@/auth";
import { getUnreadNotificationCount } from "@/lib/notification-data";

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

  const unreadNotificationCount = await getUnreadNotificationCount(
    session.user.id,
  );

  return (
    <main className="flex min-h-screen min-w-0 bg-[var(--color-background)]">
      <div className="hidden lg:block">
        <Sidebar
          role={role}
          user={session.user}
          unreadNotificationCount={unreadNotificationCount}
        />
      </div>

      <MobileSidebar
        role={role}
        user={session.user}
        unreadNotificationCount={unreadNotificationCount}
      />

      <section className="min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 sm:pb-8 lg:p-8">
        {children}
      </section>
    </main>
  );
}
