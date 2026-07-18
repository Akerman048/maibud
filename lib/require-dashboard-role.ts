import "server-only";

import { redirect } from "next/navigation";

import type { UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireDashboardRole(role: UserRole) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.onboardingRequired) {
    redirect("/onboarding");
  }

  const trustedUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      role: true,
      organizationMemberships: {
        where: { removedAt: null },
        select: { role: true },
      },
    },
  });

  if (!trustedUser?.isActive) {
    redirect("/login");
  }

  if (trustedUser.organizationMemberships.length === 0) {
    redirect("/onboarding");
  }

  if (
    trustedUser.role !== role ||
    !trustedUser.organizationMemberships.some(
      (membership) => membership.role === role,
    )
  ) {
    redirect("/project/inactive");
  }

  return { ...session.user, role: trustedUser.role };
}
