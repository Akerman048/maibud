import type { ReactNode } from "react";

import { UserRole } from "@/app/generated/prisma/client";
import { requireDashboardRole } from "@/lib/require-dashboard-role";

export default async function DesignerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireDashboardRole(UserRole.DESIGNER);

  return children;
}
