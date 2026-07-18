import "server-only";

import { InvitationStatus, Prisma } from "@/app/generated/prisma/client";

import { isInvitationExpired } from "@/lib/invitations";
import {
  findCurrentHeadOrganizationMembership,
  requireHeadOfOrganization,
} from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";
import { getPaginationMeta } from "@/lib/query-params";

export async function getCurrentHeadOrganization(userId: string) {
  const membership = await findCurrentHeadOrganizationMembership(userId);
  return membership?.organization ?? null;
}

export async function getPendingInvitations(organizationId: string, page = 1, pageSize = 20) {
  await requireHeadOfOrganization(organizationId);
  const where: Prisma.InvitationWhereInput = {
      organizationId,
      status: {
        in: [InvitationStatus.PENDING, InvitationStatus.EXPIRED],
      },
    };
  const [total, invitations] = await Promise.all([prisma.invitation.count({ where }), prisma.invitation.findMany({
    where,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })]);

  return { items: invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status:
      invitation.status === "EXPIRED" ||
      isInvitationExpired(invitation.expiresAt)
        ? ("EXPIRED" as const)
        : ("PENDING" as const),
    project: invitation.project,
    invitedByName: invitation.invitedBy.name,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  })), pagination: getPaginationMeta({ page, pageSize, total }) };
}

export async function getOrganizationProjects(organizationId: string) {
  await requireHeadOfOrganization(organizationId);

  return prisma.project.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
