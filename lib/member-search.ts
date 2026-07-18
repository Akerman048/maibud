import "server-only";

import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { requireHeadOfOrganization } from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";
import { getPaginationMeta } from "@/lib/query-params";
import type { PaginatedResult, SortDirection } from "@/types/query";
import { getActiveOrganizationMembershipWhere } from "@/lib/organization-membership";

export type MemberSearchParams = {
  organizationId: string;
  page: number;
  pageSize: number;
  search: string;
  role?: UserRole;
  active?: boolean;
  projectId?: string;
  sortBy: "name" | "createdAt" | "role";
  sortDirection: SortDirection;
};

export function buildMemberWhere(params: MemberSearchParams): Prisma.OrganizationMemberWhereInput {
  return {
    ...(params.active === true
      ? getActiveOrganizationMembershipWhere({
          organizationId: params.organizationId,
        })
      : { organizationId: params.organizationId }),
    AND: [
      ...(params.active === false ? [{ OR: [{ removedAt: { not: null } }, { user: { isActive: false } }] }] : []),
      ...(params.role ? [{ role: params.role }] : []),
      ...(params.projectId ? [{ user: { memberships: { some: { projectId: params.projectId } } } }] : []),
      ...(params.search ? [{ user: { OR: [
        { name: { contains: params.search, mode: "insensitive" as const } },
        { email: { contains: params.search, mode: "insensitive" as const } },
      ] } }] : []),
    ],
  };
}

export async function searchOrganizationMembers(params: MemberSearchParams) {
  await requireHeadOfOrganization(params.organizationId);
  const where = buildMemberWhere(params);
  const orderBy: Prisma.OrganizationMemberOrderByWithRelationInput[] = params.sortBy === "name"
    ? [{ user: { name: params.sortDirection } }, { id: params.sortDirection }]
    : params.sortBy === "role"
      ? [{ role: params.sortDirection }, { id: params.sortDirection }]
      : [{ createdAt: params.sortDirection }, { id: params.sortDirection }];
  const [total, memberships] = await Promise.all([
    prisma.organizationMember.count({ where }),
    prisma.organizationMember.findMany({
      where, orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true, userId: true, role: true, joinedAt: true, removedAt: true,
        user: { select: {
          name: true, email: true, isActive: true,
          memberships: {
            where: { project: { organizationId: params.organizationId } },
            select: { id: true, role: true, project: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
        } },
      },
    }),
  ]);
  const items = memberships.map((membership) => ({
    id: membership.id, userId: membership.userId, name: membership.user.name,
    email: membership.user.email, role: membership.role,
    joinedAt: membership.joinedAt.toISOString(), isActive: membership.user.isActive,
    removedAt: membership.removedAt?.toISOString() ?? null,
    projects: membership.user.memberships.map((projectMembership) => ({ membershipId: projectMembership.id, id: projectMembership.project.id, name: projectMembership.project.name, role: projectMembership.role })),
  }));
  return { items, pagination: getPaginationMeta({ page: params.page, pageSize: params.pageSize, total }) } satisfies PaginatedResult<(typeof items)[number]>;
}
