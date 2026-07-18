import "server-only";

import type { UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class AuthorizationError extends Error {
  status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError("Authentication required", 401);
  }

  return session.user;
}

export async function requireUser() {
  const sessionUser = await requireAuthenticatedUser();
  const trustedUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      isActive: true,
      role: true,
      organizationMemberships: {
        where: { removedAt: null },
        select: { role: true },
      },
    },
  });

  const hasCurrentRoleMembership = trustedUser?.organizationMemberships.some(
    (membership) => membership.role === trustedUser.role,
  );

  if (!trustedUser?.isActive || !hasCurrentRoleMembership) {
    throw new AuthorizationError("Active organization membership required", 403);
  }

  return {
    ...sessionUser,
    role: trustedUser.role,
    onboardingRequired: false,
  };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("Insufficient permissions", 403);
  }

  return user;
}
