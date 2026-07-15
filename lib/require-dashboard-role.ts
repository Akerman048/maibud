import "server-only";

import { redirect } from "next/navigation";

import type { UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/auth";

export async function requireDashboardRole(role: UserRole) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== role) {
    redirect("/dashboard");
  }

  return session.user;
}
