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
