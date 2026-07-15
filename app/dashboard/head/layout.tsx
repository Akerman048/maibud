import type { ReactNode } from "react";

import { UserRole } from "@/app/generated/prisma/client";
import { requireDashboardRole } from "@/lib/require-dashboard-role";

export default async function HeadLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireDashboardRole(UserRole.HEAD);

  return children;
}
