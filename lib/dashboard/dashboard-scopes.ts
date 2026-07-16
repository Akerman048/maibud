import "server-only";

import {
  DocumentStatus,
  Prisma,
  ProjectStatus,
  type UserRole,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getSingleActiveOrganizationId(
  currentUserId: string,
  role: "HEAD" | "ARCHIVIST",
) {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: currentUserId,
      role,
      removedAt: null,
      user: { isActive: true, role },
    },
    orderBy: { joinedAt: "asc" },
    take: 2,
    select: { organizationId: true },
  });

  return memberships.length === 1 ? memberships[0].organizationId : null;
}

export async function hasActiveRole(currentUserId: string, role: UserRole) {
  return (await prisma.user.count({
    where: { id: currentUserId, role, isActive: true },
  })) === 1;
}

export function getOrganizationProjectWhere(
  currentUserId: string,
  organizationId: string,
  role: "HEAD" | "ARCHIVIST",
): Prisma.ProjectWhereInput {
  return {
    organizationId,
    organization: {
      members: {
        some: {
          userId: currentUserId,
          role,
          removedAt: null,
          user: { isActive: true, role },
        },
      },
    },
    ...(role === "HEAD"
      ? { members: { some: { userId: currentUserId, role: "HEAD" } } }
      : {}),
  };
}

export function getAssignedProjectWhere(
  currentUserId: string,
  role: "EXPERT" | "DESIGNER" | "CLIENT",
): Prisma.ProjectWhereInput {
  return {
    members: {
      some: {
        userId: currentUserId,
        role,
        user: { isActive: true, role },
      },
    },
  };
}

export function activeProjectWhere(
  accessWhere: Prisma.ProjectWhereInput,
): Prisma.ProjectWhereInput {
  return {
    AND: [
      accessWhere,
      { status: { not: ProjectStatus.ARCHIVED }, archivedAt: null },
    ],
  };
}

export function activeDocumentWhere(
  projectWhere: Prisma.ProjectWhereInput,
): Prisma.DocumentWhereInput {
  return {
    status: { not: DocumentStatus.ARCHIVED },
    archivedAt: null,
    project: projectWhere,
  };
}
