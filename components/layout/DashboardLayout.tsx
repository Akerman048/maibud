import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { MobileSidebar } from "./MobileSidebar";
import {
  Sidebar,
  getDashboardRole,
} from "./Sidebar";

import { auth } from "@/auth";
import { getUnreadNotificationCount } from "@/lib/notification-data";
import { getOpenCommentThreadCount } from "@/lib/comment-threads";
import { getArchiveProjectCount } from "@/lib/archive";

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

  const [unreadNotificationCount, openCommentThreadCount, archiveCount] = await Promise.all([
    getUnreadNotificationCount(session.user.id),
    getOpenCommentThreadCount(session.user.id, session.user.role),
    role === "designer"
      ? getArchiveProjectCount(session.user.id, session.user.role)
      : Promise.resolve(0),
  ]);

  return (
    <main className="flex min-h-screen min-w-0 bg-[var(--color-background)]">
      <div className="hidden lg:block">
        <Sidebar
          role={role}
          user={session.user}
          unreadNotificationCount={unreadNotificationCount}
          openCommentThreadCount={openCommentThreadCount}
          archiveCount={archiveCount}
        />
      </div>

      <MobileSidebar
        role={role}
        user={session.user}
        unreadNotificationCount={unreadNotificationCount}
        openCommentThreadCount={openCommentThreadCount}
        archiveCount={archiveCount}
      />

      <section className="min-w-0 flex-1 px-4 pb-6 pt-20 sm:px-6 sm:pb-8 lg:p-8">
        {children}
      </section>
    </main>
  );
}
