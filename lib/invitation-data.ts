import "server-only";

import { hashInvitationToken, isInvitationExpired } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

export async function getInvitationByRawToken(token: string) {
  if (!token) {
    return null;
  }

  const invitation = await prisma.invitation.findUnique({
    where: {
      tokenHash: hashInvitationToken(token),
    },
    select: {
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          name: true,
        },
      },
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  return {
    email: invitation.email,
    role: invitation.role,
    status:
      invitation.status === "PENDING" &&
      isInvitationExpired(invitation.expiresAt)
        ? ("EXPIRED" as const)
        : invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    organizationName: invitation.organization.name,
    projectName: invitation.project?.name ?? null,
  };
}
