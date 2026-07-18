import "server-only";

import {
  NotificationType,
  Prisma,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import {
  generateInvitationToken,
  getInvitationExpirationDate,
  hashInvitationToken,
  isInvitationExpired,
  normalizeInvitationEmail,
} from "@/lib/invitations";
import {
  cancelPendingInvitationEmailJobs,
  createInvitationEmailJob,
} from "@/lib/email/email-jobs";
import {
  createInvitationInputSchema,
  invitationEmailSchema,
  invitationRegistrationSchema,
  invitationRoleSchema,
  invitationTokenSchema,
  type InvitationRole,
} from "@/lib/invitation-validation";
import {
  getDashboardHref,
  getNotificationHref,
} from "@/lib/notification-policy";
import { canApplyInvitationRole } from "@/lib/membership-policy";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export type InvitationLifecycleErrorCode =
  | "ACCOUNT_EXISTS"
  | "ACCEPTED"
  | "ACTIVE_MEMBER"
  | "EMAIL_MISMATCH"
  | "EXPIRED"
  | "INVALID"
  | "NOT_PENDING"
  | "PENDING_EXISTS"
  | "PROJECT_NOT_FOUND"
  | "RATE_LIMITED"
  | "REVOKED"
  | "ROLE_CONFLICT"
  | "SELF_INVITATION"
  | "USER_INACTIVE";

export class InvitationLifecycleError extends Error {
  code: InvitationLifecycleErrorCode;

  constructor(code: InvitationLifecycleErrorCode, message: string) {
    super(message);
    this.name = "InvitationLifecycleError";
    this.code = code;
  }
}

type TrustedInvitationContext = {
  actorEmail: string;
  actorId: string;
  organizationId: string;
};

function invitationUrl(token: string) {
  return `/invite/${token}`;
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@", 2);
  if (!local || !domain) return "•••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function createOrganizationInvitation({
  context,
  email,
  role,
  projectId,
  now = new Date(),
}: {
  context: TrustedInvitationContext;
  email: string;
  role: InvitationRole;
  projectId?: string;
  now?: Date;
}) {
  const parsedInput = createInvitationInputSchema.safeParse({
    email,
    role,
    projectId,
  });
  if (!parsedInput.success) {
    throw new InvitationLifecycleError(
      "INVALID",
      parsedInput.error.issues[0]?.message ?? "Некоректне запрошення.",
    );
  }
  email = parsedInput.data.email;
  role = parsedInput.data.role;
  projectId = parsedInput.data.projectId;

  if (normalizeInvitationEmail(context.actorEmail) === email) {
    throw new InvitationLifecycleError(
      "SELF_INVITATION",
      "Не можна запросити самого себе.",
    );
  }

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = getInvitationExpirationDate(now);

  const invitation = await prisma.$transaction(
    async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: context.organizationId },
        select: { name: true },
      });
      if (!organization) {
        throw new InvitationLifecycleError(
          "INVALID",
          "Організацію не знайдено.",
        );
      }

      const project = projectId
        ? await tx.project.findFirst({
            where: {
              id: projectId,
              organizationId: context.organizationId,
              status: { not: ProjectStatus.ARCHIVED },
            },
            select: { id: true, name: true },
          })
        : null;

      if (projectId && !project) {
        throw new InvitationLifecycleError(
          "PROJECT_NOT_FOUND",
          "Проєкт не знайдено в цій організації.",
        );
      }

      const activeMember = await tx.organizationMember.findFirst({
        where: {
          organizationId: context.organizationId,
          removedAt: null,
          user: {
            email: { equals: email, mode: "insensitive" },
          },
        },
        select: { id: true },
      });

      if (activeMember) {
        throw new InvitationLifecycleError(
          "ACTIVE_MEMBER",
          "Користувач уже є активним учасником організації.",
        );
      }

      await tx.invitation.updateMany({
        where: {
          organizationId: context.organizationId,
          email,
          status: "PENDING",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      });

      const pending = await tx.invitation.findFirst({
        where: {
          organizationId: context.organizationId,
          email,
          status: "PENDING",
          expiresAt: { gt: now },
        },
        select: { id: true },
      });

      if (pending) {
        throw new InvitationLifecycleError(
          "PENDING_EXISTS",
          "Активне запрошення для цього email уже існує.",
        );
      }

      const created = await tx.invitation.create({
        data: {
          email,
          role,
          tokenHash,
          organizationId: context.organizationId,
          projectId,
          invitedById: context.actorId,
          expiresAt,
        },
        select: { id: true, expiresAt: true },
      });

      await tx.auditLog.create({
        data: {
          action: "Створено запрошення користувача",
          entityType: "INVITATION",
          entityId: created.id,
          userId: context.actorId,
          projectId,
        },
      });

      await createInvitationEmailJob(tx, {
        invitationId: created.id,
        recipientEmail: email,
        organizationName: organization.name,
        role,
        projectName: project?.name,
        expiresAt,
        href: invitationUrl(token),
      });

      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return {
    invitationId: invitation.id,
    expiresAt: invitation.expiresAt,
    inviteUrl: invitationUrl(token),
  };
}

export async function inspectOrganizationInvitation(
  rawToken: string,
  viewerEmail?: string | null,
) {
  const parsedToken = invitationTokenSchema.safeParse(rawToken);
  if (!parsedToken.success) return { status: "invalid" as const };

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashInvitationToken(parsedToken.data) },
    select: {
      email: true,
      role: true,
      status: true,
      acceptedAt: true,
      revokedAt: true,
      expiresAt: true,
      organization: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  if (!invitation) return { status: "invalid" as const };
  if (invitation.status === "ACCEPTED" || invitation.acceptedAt) {
    return { status: "accepted" as const };
  }
  if (invitation.status === "REVOKED" || invitation.revokedAt) {
    return { status: "revoked" as const };
  }
  if (invitation.status === "EXPIRED" || isInvitationExpired(invitation.expiresAt)) {
    return { status: "expired" as const };
  }
  if (!invitationRoleSchema.safeParse(invitation.role).success) {
    return { status: "invalid" as const };
  }

  const account = await prisma.user.findFirst({
    where: {
      email: { equals: invitation.email, mode: "insensitive" },
    },
    select: { id: true, isActive: true },
  });
  const viewerStatus = viewerEmail
    ? normalizeInvitationEmail(viewerEmail) ===
      normalizeInvitationEmail(invitation.email)
      ? ("authenticated-matching" as const)
      : ("authenticated-wrong" as const)
    : !account
      ? ("unauthenticated-new" as const)
      : account.isActive
        ? ("unauthenticated-existing" as const)
        : ("inactive-existing" as const);

  return {
    status: "valid" as const,
    organizationName: invitation.organization.name,
    role: invitation.role as InvitationRole,
    email: maskEmail(invitation.email),
    expiresAt: invitation.expiresAt.toISOString(),
    projectName: invitation.project?.name ?? null,
    viewerStatus,
  };
}

async function acceptOrganizationInvitationInTransaction({
  tx,
  tokenHash,
  userId,
  now,
}: {
  tx: Prisma.TransactionClient;
  tokenHash: string;
  userId: string;
  now: Date;
}) {
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "Invitation"
        WHERE "tokenHash" = ${tokenHash}
        FOR UPDATE
      `);
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          acceptedAt: true,
          revokedAt: true,
          expiresAt: true,
          organizationId: true,
          projectId: true,
          invitedById: true,
        },
      });

      if (!invitation) {
        throw new InvitationLifecycleError("INVALID", "Запрошення недійсне.");
      }
      if (invitation.status === "ACCEPTED" || invitation.acceptedAt) {
        throw new InvitationLifecycleError("ACCEPTED", "Запрошення вже використано.");
      }
      if (invitation.status === "REVOKED" || invitation.revokedAt) {
        throw new InvitationLifecycleError("REVOKED", "Запрошення було відкликано.");
      }
      if (invitation.status === "EXPIRED" || isInvitationExpired(invitation.expiresAt, now)) {
        throw new InvitationLifecycleError("EXPIRED", "Термін дії запрошення минув.");
      }

      const parsedRole = invitationRoleSchema.safeParse(invitation.role);
      if (!parsedRole.success) {
        throw new InvitationLifecycleError("INVALID", "Запрошення недійсне.");
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          organizationMemberships: {
            where: {
              removedAt: null,
              organizationId: { not: invitation.organizationId },
            },
            take: 1,
            select: { id: true },
          },
        },
      });

      if (!user?.isActive) {
        throw new InvitationLifecycleError(
          "USER_INACTIVE",
          "Обліковий запис недоступний.",
        );
      }
      if (normalizeInvitationEmail(user.email) !== invitation.email) {
        throw new InvitationLifecycleError(
          "EMAIL_MISMATCH",
          "Email поточного облікового запису не збігається із запрошенням.",
        );
      }
      const roleChanged = user.role !== parsedRole.data;
      if (
        !canApplyInvitationRole({
          currentGlobalRole: user.role,
          invitationRole: parsedRole.data,
          hasOtherActiveOrganizationMemberships:
            user.organizationMemberships.length > 0,
        })
      ) {
        throw new InvitationLifecycleError(
          "ROLE_CONFLICT",
          "Роль запрошення конфліктує з активною роллю в іншій організації.",
        );
      }

      const existingMembership = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
        select: { id: true, role: true, removedAt: true },
      });

      if (
        existingMembership &&
        !existingMembership.removedAt &&
        existingMembership.role !== parsedRole.data
      ) {
        throw new InvitationLifecycleError(
          "ROLE_CONFLICT",
          "Користувач уже має іншу роль у цій організації.",
        );
      }

      const claimed = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          status: "PENDING",
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
          acceptedById: userId,
        },
      });

      if (claimed.count !== 1) {
        throw new InvitationLifecycleError(
          "NOT_PENDING",
          "Запрошення вже використано, відкликано або його термін минув.",
        );
      }

      if (roleChanged) {
        await tx.user.update({
          where: { id: userId },
          data: { role: parsedRole.data },
        });
      }

      let organizationMembershipId = existingMembership?.id;
      let membershipChanged = Boolean(existingMembership?.removedAt);

      if (!existingMembership || existingMembership.removedAt) {
        const membership = await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId,
            },
          },
          create: {
            organizationId: invitation.organizationId,
            userId,
            role: parsedRole.data,
          },
          update: {
            role: parsedRole.data,
            removedAt: null,
            joinedAt: now,
          },
          select: { id: true },
        });
        organizationMembershipId = membership.id;
        membershipChanged = true;
      }

      if (!organizationMembershipId) {
        throw new InvitationLifecycleError("INVALID", "Запрошення недійсне.");
      }

      let projectMembershipId: string | null = null;
      if (invitation.projectId) {
        const project = await tx.project.findFirst({
          where: {
            id: invitation.projectId,
            organizationId: invitation.organizationId,
            status: { not: ProjectStatus.ARCHIVED },
          },
          select: { id: true },
        });

        if (!project) {
          throw new InvitationLifecycleError(
            "PROJECT_NOT_FOUND",
            "Проєкт запрошення більше не доступний.",
          );
        }

        const projectMembership = await tx.projectMember.upsert({
          where: { userId_projectId: { userId, projectId: project.id } },
          create: { userId, projectId: project.id, role: parsedRole.data },
          update: { role: parsedRole.data },
          select: { id: true },
        });
        projectMembershipId = projectMembership.id;
      }

      const auditEntries = [
        {
          action: "Запрошення прийнято",
          entityType: "INVITATION",
          entityId: invitation.id,
          userId,
          projectId: invitation.projectId,
        },
      ];
      if (membershipChanged) {
        auditEntries.push({
          action: "Користувача додано до організації",
          entityType: "ORGANIZATION_MEMBER",
          entityId: organizationMembershipId,
          userId,
          projectId: null,
        });
      }
      if (projectMembershipId && invitation.projectId) {
        auditEntries.push({
          action: "Користувача додано до проєкту",
          entityType: "PROJECT_MEMBER",
          entityId: projectMembershipId,
          userId,
          projectId: invitation.projectId,
        });
      }
      await tx.auditLog.createMany({ data: auditEntries });

      await createNotification(tx, {
        userId: invitation.invitedById,
        actorId: userId,
        type: NotificationType.INVITATION_ACCEPTED,
        title: "Запрошення прийнято",
        message: `${user.name} приєднався до організації.`,
        href: getNotificationHref({ destination: "MEMBERS", role: UserRole.HEAD }),
        projectId: invitation.projectId ?? undefined,
      });

      await cancelPendingInvitationEmailJobs(tx, invitation.id);

      return {
        organizationId: invitation.organizationId,
        role: parsedRole.data,
        dashboardPath: getDashboardHref(parsedRole.data),
        membershipAlreadyActive: !membershipChanged,
        roleChanged,
      };
}

export async function acceptOrganizationInvitation({
  token,
  userId,
  now = new Date(),
}: {
  token: string;
  userId: string;
  now?: Date;
}) {
  const parsedToken = invitationTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    throw new InvitationLifecycleError("INVALID", "Запрошення недійсне.");
  }
  const tokenHash = hashInvitationToken(parsedToken.data);

  return prisma.$transaction(
    (tx) =>
      acceptOrganizationInvitationInTransaction({ tx, tokenHash, userId, now }),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function registerAndAcceptOrganizationInvitation(input: {
  token: string;
  name: string;
  password: string;
  confirmPassword: string;
  now?: Date;
}) {
  const parsed = invitationRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvitationLifecycleError(
      "INVALID",
      parsed.error.issues[0]?.message ?? "Перевірте введені дані.",
    );
  }

  const now = input.now ?? new Date();
  const tokenHash = hashInvitationToken(parsed.data.token);
  const passwordHash = await hashPassword(parsed.data.password);

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "Invitation"
        WHERE "tokenHash" = ${tokenHash}
        FOR UPDATE
      `);
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        select: { email: true, role: true },
      });
      const email = invitationEmailSchema.safeParse(invitation?.email);
      const role = invitationRoleSchema.safeParse(invitation?.role);
      if (!invitation || !email.success || !role.success) {
        throw new InvitationLifecycleError("INVALID", "Запрошення недійсне.");
      }

      const existingUser = await tx.user.findFirst({
        where: { email: { equals: email.data, mode: "insensitive" } },
        select: { id: true },
      });
      if (existingUser) {
        throw new InvitationLifecycleError(
          "ACCOUNT_EXISTS",
          "Обліковий запис уже існує. Увійдіть, щоб прийняти запрошення.",
        );
      }

      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: email.data,
          passwordHash,
          role: role.data,
        },
        select: { id: true },
      });

      const accepted = await acceptOrganizationInvitationInTransaction({
        tx,
        tokenHash,
        userId: user.id,
        now,
      });
      return { ...accepted, userId: user.id, email: email.data };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function revokeOrganizationInvitation({
  context,
  invitationId,
  now = new Date(),
}: {
  context: TrustedInvitationContext;
  invitationId: string;
  now?: Date;
}) {
  await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({
      where: { id: invitationId, organizationId: context.organizationId },
      select: { id: true, status: true, expiresAt: true, projectId: true },
    });

    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      isInvitationExpired(invitation.expiresAt, now)
    ) {
      throw new InvitationLifecycleError(
        "NOT_PENDING",
        "Відкликати можна лише активне запрошення.",
      );
    }

    const revoked = await tx.invitation.updateMany({
      where: {
        id: invitationId,
        organizationId: context.organizationId,
        status: "PENDING",
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { status: "REVOKED", revokedAt: now },
    });

    if (revoked.count !== 1) {
      throw new InvitationLifecycleError(
        "NOT_PENDING",
        "Запрошення вже змінилося.",
      );
    }

    await cancelPendingInvitationEmailJobs(tx, invitationId);

    await tx.auditLog.create({
      data: {
        action: "Запрошення відкликано",
        entityType: "INVITATION",
        entityId: invitationId,
        userId: context.actorId,
        projectId: invitation.projectId,
      },
    });
  });
}

export async function rotateOrganizationInvitation({
  context,
  invitationId,
  now = new Date(),
}: {
  context: TrustedInvitationContext;
  invitationId: string;
  now?: Date;
}) {
  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = getInvitationExpirationDate(now);

  await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({
      where: { id: invitationId, organizationId: context.organizationId },
      select: {
        email: true,
        role: true,
        status: true,
        acceptedAt: true,
        revokedAt: true,
        expiresAt: true,
        tokenHash: true,
        projectId: true,
        updatedAt: true,
        organization: { select: { name: true } },
        project: { select: { name: true } },
      },
    });

    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      isInvitationExpired(invitation.expiresAt, now)
    ) {
      throw new InvitationLifecycleError(
        "NOT_PENDING",
        "Оновити можна лише активне запрошення.",
      );
    }
    if (now.getTime() - invitation.updatedAt.getTime() < 60_000) {
      throw new InvitationLifecycleError(
        "NOT_PENDING",
        "Оновити посилання можна через 60 секунд.",
      );
    }

    const rotated = await tx.invitation.updateMany({
      where: {
        id: invitationId,
        organizationId: context.organizationId,
        tokenHash: invitation.tokenHash,
        status: "PENDING",
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { tokenHash, expiresAt },
    });

    if (rotated.count !== 1) {
      throw new InvitationLifecycleError(
        "NOT_PENDING",
        "Запрошення вже змінилося.",
      );
    }

    await cancelPendingInvitationEmailJobs(tx, invitationId);

    await tx.auditLog.create({
      data: {
        action: "Запрошення оновлено",
        entityType: "INVITATION",
        entityId: invitationId,
        userId: context.actorId,
        projectId: invitation.projectId,
      },
    });

    await createInvitationEmailJob(tx, {
      invitationId,
      recipientEmail: invitation.email,
      organizationName: invitation.organization.name,
      role: invitation.role,
      projectName: invitation.project?.name,
      expiresAt,
      href: invitationUrl(token),
    });
  });

  return { expiresAt, inviteUrl: invitationUrl(token) };
}
