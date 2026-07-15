import "server-only";

import { isInvitationExpired } from "@/lib/invitations";
import { requireHeadOfOrganization } from "@/lib/organization-access";
import { prisma } from "@/lib/prisma";

export async function getCurrentHeadOrganization(userId: string) {
  return prisma.organization.findFirst({
    where: {
      members: {
        some: {
          userId,
          role: "HEAD",
          removedAt: null,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getOrganizationMembers(organizationId: string) {
  await requireHeadOfOrganization(organizationId);

  const memberships = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      removedAt: null,
    },
    select: {
      id: true,
      userId: true,
      role: true,
      joinedAt: true,
      removedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          isActive: true,
          memberships: {
            where: {
              project: {
                organizationId,
              },
            },
            select: {
              id: true,
              role: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return memberships.map((membership) => ({
    id: membership.id,
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.joinedAt.toISOString(),
    isActive: membership.user.isActive,
    removedAt: membership.removedAt?.toISOString() ?? null,
    projects: membership.user.memberships.map((projectMembership) => ({
      membershipId: projectMembership.id,
      id: projectMembership.project.id,
      name: projectMembership.project.name,
      role: projectMembership.role,
    })),
  }));
}

export async function getPendingInvitations(organizationId: string) {
  await requireHeadOfOrganization(organizationId);

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId,
      status: {
        in: ["PENDING", "EXPIRED"],
      },
    },
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
  });

  return invitations.map((invitation) => ({
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
  }));
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
