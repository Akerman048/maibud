import "server-only";

import type {
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export async function getProjectMemberUserIds(
  tx: Prisma.TransactionClient,
  projectId: string,
  roles: UserRole[],
) {
  const memberships = await tx.projectMember.findMany({
    where: {
      projectId,
      role: { in: roles },
      user: { isActive: true },
    },
    select: { userId: true },
  });

  return unique(memberships.map(({ userId }) => userId));
}

export async function getProjectMembers(
  tx: Prisma.TransactionClient,
  projectId: string,
  roles: UserRole[],
) {
  const memberships = await tx.projectMember.findMany({
    where: {
      projectId,
      role: { in: roles },
      user: { isActive: true },
    },
    select: { userId: true, role: true },
  });

  return Array.from(
    new Map(
      memberships.map((membership) => [membership.userId, membership]),
    ).values(),
  );
}

export function getClientMemberUserIds(
  tx: Prisma.TransactionClient,
  projectId: string,
) {
  return getProjectMemberUserIds(tx, projectId, ["CLIENT"]);
}

export function getExpertMemberUserIds(
  tx: Prisma.TransactionClient,
  projectId: string,
) {
  return getProjectMemberUserIds(tx, projectId, ["EXPERT"]);
}

export function getDesignerMemberUserIds(
  tx: Prisma.TransactionClient,
  projectId: string,
) {
  return getProjectMemberUserIds(tx, projectId, ["DESIGNER"]);
}

export async function getDocumentAuthorUserId(
  tx: Prisma.TransactionClient,
  documentId: string,
) {
  const document = await tx.document.findUnique({
    where: { id: documentId },
    select: {
      author: {
        select: { id: true, isActive: true },
      },
    },
  });

  return document?.author.isActive ? document.author.id : null;
}

export async function getHeadMemberUserIds(
  tx: Prisma.TransactionClient,
  organizationId: string,
) {
  const members = await tx.organizationMember.findMany({
    where: {
      organizationId,
      role: "HEAD",
      removedAt: null,
      user: { isActive: true },
    },
    select: { userId: true },
  });

  return unique(members.map(({ userId }) => userId));
}
