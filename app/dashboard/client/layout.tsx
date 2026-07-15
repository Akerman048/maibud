import type { ReactNode } from "react";

import { UserRole } from "@/app/generated/prisma/client";
import { requireDashboardRole } from "@/lib/require-dashboard-role";

type ClientLayoutProps = {
  children: ReactNode;
};

export default async function ClientLayout({
  children,
}: ClientLayoutProps) {
  await requireDashboardRole(UserRole.CLIENT);

  return children;
}
