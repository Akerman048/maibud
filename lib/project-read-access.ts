import "server-only";

import type {
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";

export function getInternalProjectReadAccessWhere(
  userId: string,
  role: UserRole,
): Prisma.ProjectWhereInput {
  const organizationMembership = {
    some: {
      userId,
      role,
      removedAt: null,
      user: { isActive: true },
    },
  };

  if (role === "ARCHIVIST") {
    return {
      organization: { members: organizationMembership },
    };
  }

  if (role === "HEAD" || role === "EXPERT" || role === "DESIGNER") {
    return {
      members: { some: { userId, role } },
      organization: { members: organizationMembership },
    };
  }

  return { id: "__internal_project_read_access_denied__" };
}
