import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { z } from "zod";

const resetEmailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((email) => email.toLowerCase());

export type DevResetSummary = {
  email: string;
  userFound: boolean;
  userKind: "credentials" | "google" | "hybrid" | null;
  accounts: number;
  projectMemberships: number;
  organizationMemberships: number;
  invitationsDeleted: number;
  acceptedInvitationReferencesCleared: number;
  notificationsDeleted: number;
  auditReferencesCleared: number;
  commentsDeleted: number;
  emptyOrganizationsDeleted: number;
  sharedProjectsDeleted: 0;
  sharedDocumentsDeleted: 0;
  blockers: string[];
};

export class DevResetSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevResetSafetyError";
  }
}

export function assertDevResetAllowed(environment: NodeJS.ProcessEnv) {
  if (environment.NODE_ENV === "production") {
    throw new DevResetSafetyError(
      "Refusing to reset a user while NODE_ENV=production.",
    );
  }
  if (environment.ALLOW_DEV_DATABASE_RESET !== "true") {
    throw new DevResetSafetyError(
      "Refusing to reset a user without ALLOW_DEV_DATABASE_RESET=true.",
    );
  }
}

export function normalizeDevResetEmail(value: unknown) {
  const parsed = resetEmailSchema.safeParse(value);
  if (!parsed.success) {
    throw new DevResetSafetyError("A valid email address is required.");
  }
  return parsed.data;
}

type ResetTransaction = Prisma.TransactionClient;

async function buildSummary(tx: ResetTransaction, email: string) {
  const user = await tx.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      accounts: { select: { id: true, provider: true } },
      memberships: { select: { id: true } },
      organizationMemberships: {
        select: {
          id: true,
          role: true,
          organization: {
            select: {
              id: true,
              projects: { select: { id: true } },
              members: { select: { userId: true } },
              invitations: {
                select: {
                  id: true,
                  email: true,
                  invitedById: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      sentInvitations: {
        select: { id: true, email: true, status: true },
      },
      acceptedInvitations: { select: { id: true } },
      documents: { select: { id: true } },
      documentVersions: { select: { id: true } },
      comments: { select: { id: true } },
      createdCommentThreads: { select: { id: true } },
      commentMessages: { select: { id: true } },
      notifications: { select: { id: true } },
      auditLogs: { select: { id: true } },
    },
  });

  if (!user) {
    const summary: DevResetSummary = {
      email,
      userFound: false,
      userKind: null,
      accounts: 0,
      projectMemberships: 0,
      organizationMemberships: 0,
      invitationsDeleted: 0,
      acceptedInvitationReferencesCleared: 0,
      notificationsDeleted: 0,
      auditReferencesCleared: 0,
      commentsDeleted: 0,
      emptyOrganizationsDeleted: 0,
      sharedProjectsDeleted: 0,
      sharedDocumentsDeleted: 0,
      blockers: [],
    };
    return { summary, user: null, invitationIds: [], organizationIds: [] };
  }

  const normalizedStoredEmail = normalizeDevResetEmail(user.email);
  const invitationsForEmail = await tx.invitation.findMany({
    where: { email: { equals: normalizedStoredEmail, mode: "insensitive" } },
    select: { id: true },
  });
  const invitationIds = new Set<string>();
  for (const invitation of invitationsForEmail) {
    invitationIds.add(invitation.id);
  }
  const unsafeAcceptedInvitations = user.sentInvitations.filter(
    (invitation) =>
      invitation.status === "ACCEPTED" &&
      normalizeDevResetEmail(invitation.email) !== normalizedStoredEmail,
  );

  for (const invitation of user.sentInvitations) {
    if (
      invitation.status !== "ACCEPTED" ||
      normalizeDevResetEmail(invitation.email) === normalizedStoredEmail
    ) {
      invitationIds.add(invitation.id);
    }
  }
  for (const membership of user.organizationMemberships) {
    for (const invitation of membership.organization.invitations) {
      if (normalizeDevResetEmail(invitation.email) === normalizedStoredEmail) {
        invitationIds.add(invitation.id);
      }
    }
  }

  const organizationIds = user.organizationMemberships
    .filter((membership) => {
      const organization = membership.organization;
      const remainingInvitations = organization.invitations.filter(
        (invitation) => !invitationIds.has(invitation.id),
      );
      return (
        membership.role === "HEAD" &&
        organization.members.every((member) => member.userId === user.id) &&
        organization.projects.length === 0 &&
        remainingInvitations.length === 0
      );
    })
    .map((membership) => membership.organization.id);

  const blockers = [
    ...(user.documents.length
      ? [`User authors ${user.documents.length} document(s).`]
      : []),
    ...(user.documentVersions.length
      ? [`User created ${user.documentVersions.length} document version(s).`]
      : []),
    ...(user.createdCommentThreads.length
      ? [`User created ${user.createdCommentThreads.length} comment thread(s).`]
      : []),
    ...(user.commentMessages.length
      ? [`User authored ${user.commentMessages.length} comment message(s).`]
      : []),
    ...(unsafeAcceptedInvitations.length
      ? [
          `User sent ${unsafeAcceptedInvitations.length} accepted invitation(s) to other users.`,
        ]
      : []),
  ];
  const hasGoogle = user.accounts.some((account) => account.provider === "google");
  const userKind = user.passwordHash
    ? hasGoogle
      ? "hybrid"
      : "credentials"
    : hasGoogle
      ? "google"
      : "credentials";
  const summary: DevResetSummary = {
    email: normalizedStoredEmail,
    userFound: true,
    userKind,
    accounts: user.accounts.length,
    projectMemberships: user.memberships.length,
    organizationMemberships: user.organizationMemberships.length,
    invitationsDeleted: invitationIds.size,
    acceptedInvitationReferencesCleared: user.acceptedInvitations.filter(
      (invitation) => !invitationIds.has(invitation.id),
    ).length,
    notificationsDeleted: user.notifications.length,
    auditReferencesCleared: user.auditLogs.length,
    commentsDeleted: user.comments.length,
    emptyOrganizationsDeleted: organizationIds.length,
    sharedProjectsDeleted: 0,
    sharedDocumentsDeleted: 0,
    blockers,
  };

  return {
    summary,
    user,
    invitationIds: [...invitationIds],
    organizationIds,
  };
}

export async function resetDevUser({
  prisma,
  email,
  dryRun,
  onSummary,
}: {
  prisma: Pick<PrismaClient, "$transaction">;
  email: string;
  dryRun: boolean;
  onSummary: (summary: DevResetSummary) => void;
}) {
  const normalizedEmail = normalizeDevResetEmail(email);

  return prisma.$transaction(
    async (tx) => {
      const plan = await buildSummary(tx, normalizedEmail);
      onSummary(plan.summary);

      if (!plan.user || dryRun) return plan.summary;
      if (plan.summary.blockers.length) {
        throw new DevResetSafetyError(
          `Reset blocked: ${plan.summary.blockers.join(" ")}`,
        );
      }

      const userId = plan.user.id;
      await tx.emailJob.deleteMany({
        where: { recipientEmail: { equals: normalizedEmail, mode: "insensitive" } },
      });
      await tx.invitation.updateMany({
        where: { acceptedById: userId, id: { notIn: plan.invitationIds } },
        data: { acceptedById: null },
      });
      if (plan.invitationIds.length) {
        await tx.invitation.deleteMany({
          where: { id: { in: plan.invitationIds } },
        });
      }
      await tx.account.deleteMany({ where: { userId } });
      await tx.projectMember.deleteMany({ where: { userId } });
      await tx.organizationMember.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notification.updateMany({
        where: { actorId: userId },
        data: { actorId: null },
      });
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.comment.deleteMany({ where: { authorId: userId } });
      if (plan.organizationIds.length) {
        await tx.organization.deleteMany({
          where: {
            id: { in: plan.organizationIds },
            projects: { none: {} },
            members: { none: {} },
            invitations: { none: {} },
          },
        });
      }
      await tx.user.delete({ where: { id: userId } });
      return plan.summary;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function runDevResetCommand({
  args,
  environment,
  createPrisma,
  output,
}: {
  args: string[];
  environment: NodeJS.ProcessEnv;
  createPrisma: () => Promise<Pick<PrismaClient, "$transaction" | "$disconnect">>;
  output: (value: unknown) => void;
}) {
  assertDevResetAllowed(environment);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter(
    (argument) => argument !== "--dry-run" && argument !== "--",
  );
  if (positional.length !== 1) {
    throw new DevResetSafetyError(
      "Usage: pnpm run dev:reset-user -- user@example.com [--dry-run]",
    );
  }
  const email = normalizeDevResetEmail(positional[0]);
  const prisma = await createPrisma();
  try {
    return await resetDevUser({
      prisma,
      email,
      dryRun,
      onSummary: (summary) => output({ dryRun, summary }),
    });
  } finally {
    await prisma.$disconnect();
  }
}
