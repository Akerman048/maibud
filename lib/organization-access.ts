import "server-only";

import type { UserRole } from "@/app/generated/prisma/client";
import {
  AuthorizationError,
  requireUser,
} from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function requireOrganizationMember(
  organizationId: string,
) {
  const user = await requireUser();
  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id,
      removedAt: null,
      user: {
        isActive: true,
      },
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      role: true,
      joinedAt: true,
    },
  });

  if (!membership) {
    throw new AuthorizationError(
      "Organization membership required",
      403,
    );
  }

  return { user, membership };
}

export async function requireOrganizationRole(
  organizationId: string,
  allowedRoles: UserRole[],
) {
  const result = await requireOrganizationMember(organizationId);

  if (!allowedRoles.includes(result.membership.role)) {
    throw new AuthorizationError(
      "Insufficient organization permissions",
      403,
    );
  }

  return result;
}

export function requireHeadOfOrganization(organizationId: string) {
  return requireOrganizationRole(organizationId, ["HEAD"]);
}

export function findCurrentHeadOrganizationMembership(userId: string) {
  return prisma.organizationMember.findFirst({
    where: {
      userId,
      role: "HEAD",
      removedAt: null,
      user: { isActive: true },
    },
    orderBy: [
      { organization: { createdAt: "asc" } },
      { joinedAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      organizationId: true,
      role: true,
      user: { select: { email: true } },
      organization: { select: { id: true, name: true } },
    },
  });
}

export async function requireCurrentHeadOrganization() {
  const user = await requireUser();
  const membership = await findCurrentHeadOrganizationMembership(user.id);

  if (!membership) {
    throw new AuthorizationError("HEAD organization membership required", 403);
  }

  return {
    user,
    actorEmail: membership.user.email,
    membership,
    organization: membership.organization,
  };
}
