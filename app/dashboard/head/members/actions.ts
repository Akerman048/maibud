"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  NotificationType,
  Prisma,
  UserRole,
} from "@/app/generated/prisma/client";
import { AuthorizationError } from "@/lib/auth-guard";
import {
  cancelPendingInvitationEmailJobs,
  createInvitationEmailJob,
} from "@/lib/email/email-jobs";
import {
  generateInvitationToken,
  getInvitationExpirationDate,
  normalizeInvitationEmail,
} from "@/lib/invitations";
import {
  canChangeOrganizationRole,
  canRemoveOrganizationMember,
} from "@/lib/membership-policy";
import { requireHeadOfOrganization } from "@/lib/organization-access";
import { getNotificationHref } from "@/lib/notification-policy";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { OrganizationActionState } from "@/types/organization";

class OrganizationActionError extends Error {}

const idSchema = z.string().trim().min(1, "Не вказано ідентифікатор.");
const invitationRoleSchema = z.enum([
  UserRole.EXPERT,
  UserRole.DESIGNER,
  UserRole.ARCHIVIST,
  UserRole.CLIENT,
]);
const memberRoleSchema = z.enum([
  UserRole.HEAD,
  UserRole.EXPERT,
  UserRole.DESIGNER,
  UserRole.ARCHIVIST,
  UserRole.CLIENT,
]);
const createInvitationSchema = z.object({
  organizationId: idSchema,
  email: z
    .string()
    .trim()
    .email("Вкажіть коректний email.")
    .transform(normalizeInvitationEmail),
  role: invitationRoleSchema,
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

function revalidateMembers() {
  revalidatePath("/dashboard/head/members");
}

function stateFromError(error: unknown): OrganizationActionState {
  if (error instanceof OrganizationActionError) {
    return { error: error.message, success: false };
  }

  if (error instanceof AuthorizationError) {
    return {
      error:
        error.status === 401
          ? "Увійдіть у систему, щоб виконати дію."
          : "Недостатньо прав у цій організації.",
      success: false,
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return {
      error: "Дані вже змінилися. Оновіть сторінку та повторіть дію.",
      success: false,
    };
  }

  console.error("Organization member action failed", error);

  return {
    error: "Не вдалося виконати дію.",
    success: false,
  };
}

function getParsedData<T>(result: z.ZodSafeParseResult<T>) {
  if (!result.success) {
    throw new OrganizationActionError(
      result.error.issues[0]?.message ?? "Некоректні дані форми.",
    );
  }

  return result.data;
}

export async function createInvitation(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      createInvitationSchema.safeParse({
        organizationId: formData.get("organizationId"),
        email: formData.get("email"),
        role: formData.get("role"),
        projectId: formData.get("projectId"),
      }),
    );
    const { user } = await requireHeadOfOrganization(
      input.organizationId,
    );
    const { token, tokenHash } = generateInvitationToken();
    const now = new Date();
    const expiresAt = getInvitationExpirationDate(now);
    const inviteUrl = `/invite/${token}`;

    await prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.findUnique({
          where: { id: input.organizationId },
          select: { name: true },
        });

        if (!organization) {
          throw new OrganizationActionError("Організацію не знайдено.");
        }

        const project = input.projectId
          ? await tx.project.findFirst({
              where: {
                id: input.projectId,
                organizationId: input.organizationId,
              },
              select: { id: true, name: true },
            })
          : null;

        if (input.projectId && !project) {
          throw new OrganizationActionError(
            "Проєкт не знайдено в цій організації.",
          );
        }

        const activeMember = await tx.organizationMember.findFirst({
          where: {
            organizationId: input.organizationId,
            removedAt: null,
            user: {
              email: {
                equals: input.email,
                mode: "insensitive",
              },
            },
          },
          select: { id: true },
        });

        if (activeMember) {
          throw new OrganizationActionError(
            "Користувач уже є активним учасником організації.",
          );
        }

        const duplicateInvitation = await tx.invitation.findFirst({
          where: {
            organizationId: input.organizationId,
            email: input.email,
            projectId: input.projectId ?? null,
            status: "PENDING",
            expiresAt: { gt: now },
          },
          select: { id: true },
        });

        if (duplicateInvitation) {
          throw new OrganizationActionError(
            "Активне запрошення для цього email уже існує.",
          );
        }

        const invitation = await tx.invitation.create({
          data: {
            email: input.email,
            role: input.role,
            tokenHash,
            organizationId: input.organizationId,
            projectId: input.projectId,
            invitedById: user.id,
            expiresAt,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "Створено запрошення користувача",
            entityType: "INVITATION",
            entityId: invitation.id,
            userId: user.id,
            projectId: input.projectId,
          },
        });

        await createInvitationEmailJob(tx, {
          invitationId: invitation.id,
          recipientEmail: input.email,
          organizationName: organization.name,
          role: input.role,
          projectName: project?.name,
          expiresAt,
          href: inviteUrl,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidateMembers();

    return {
      error: "",
      success: true,
      inviteUrl,
    };
  } catch (error) {
    return stateFromError(error);
  }
}

const invitationMutationSchema = z.object({
  organizationId: idSchema,
  invitationId: idSchema,
});

export async function revokeInvitation(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      invitationMutationSchema.safeParse({
        organizationId: formData.get("organizationId"),
        invitationId: formData.get("invitationId"),
      }),
    );
    const { user } = await requireHeadOfOrganization(
      input.organizationId,
    );

    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
          status: "PENDING",
        },
        select: {
          projectId: true,
        },
      });

      if (!invitation) {
        throw new OrganizationActionError(
          "Запрошення вже використано, відкликано або не існує.",
        );
      }

      const result = await tx.invitation.updateMany({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        throw new OrganizationActionError(
          "Запрошення вже використано, відкликано або не існує.",
        );
      }

      await tx.auditLog.create({
        data: {
          action: "Запрошення відкликано",
          entityType: "INVITATION",
          entityId: input.invitationId,
          userId: user.id,
          projectId: invitation.projectId,
        },
      });

      await cancelPendingInvitationEmailJobs(tx, input.invitationId);
    });

    revalidateMembers();
    return { error: "", success: true };
  } catch (error) {
    return stateFromError(error);
  }
}

export async function resendInvitation(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      invitationMutationSchema.safeParse({
        organizationId: formData.get("organizationId"),
        invitationId: formData.get("invitationId"),
      }),
    );
    const { user } = await requireHeadOfOrganization(
      input.organizationId,
    );
    const { token, tokenHash } = generateInvitationToken();
    const expiresAt = getInvitationExpirationDate();
    const inviteUrl = `/invite/${token}`;

    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
        },
        select: {
          email: true,
          role: true,
          status: true,
          projectId: true,
          updatedAt: true,
          organization: { select: { name: true } },
          project: { select: { name: true } },
        },
      });

      if (
        !invitation ||
        !["PENDING", "EXPIRED"].includes(invitation.status)
      ) {
        throw new OrganizationActionError(
          "Оновити можна лише pending або expired запрошення.",
        );
      }

      if (Date.now() - invitation.updatedAt.getTime() < 60_000) {
        throw new OrganizationActionError(
          "Повторне надсилання доступне через 60 секунд.",
        );
      }

      await cancelPendingInvitationEmailJobs(tx, input.invitationId);

      const result = await tx.invitation.updateMany({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
          status: { in: ["PENDING", "EXPIRED"] },
        },
        data: {
          tokenHash,
          status: "PENDING",
          expiresAt,
          revokedAt: null,
        },
      });

      if (result.count !== 1) {
        throw new OrganizationActionError(
          "Запрошення вже змінилося. Оновіть сторінку.",
        );
      }

      await tx.auditLog.create({
        data: {
          action: "Запрошення оновлено",
          entityType: "INVITATION",
          entityId: input.invitationId,
          userId: user.id,
          projectId: invitation.projectId,
        },
      });

      await createInvitationEmailJob(tx, {
        invitationId: input.invitationId,
        recipientEmail: invitation.email,
        organizationName: invitation.organization.name,
        role: invitation.role,
        projectName: invitation.project?.name,
        expiresAt,
        href: inviteUrl,
      });
    });

    revalidateMembers();
    return {
      error: "",
      success: true,
      inviteUrl,
    };
  } catch (error) {
    return stateFromError(error);
  }
}

const membershipMutationSchema = z.object({
  organizationId: idSchema,
  organizationMemberId: idSchema,
});

export async function removeOrganizationMember(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      membershipMutationSchema.safeParse({
        organizationId: formData.get("organizationId"),
        organizationMemberId: formData.get("organizationMemberId"),
      }),
    );
    const { user: actor } = await requireHeadOfOrganization(
      input.organizationId,
    );

    await prisma.$transaction(
      async (tx) => {
        const target = await tx.organizationMember.findFirst({
          where: {
            id: input.organizationMemberId,
            organizationId: input.organizationId,
            removedAt: null,
          },
          select: {
            id: true,
            userId: true,
            role: true,
          },
        });

        if (!target) {
          throw new OrganizationActionError(
            "Учасника організації не знайдено.",
          );
        }

        const activeHeadCount =
          await tx.organizationMember.count({
            where: {
              organizationId: input.organizationId,
              role: "HEAD",
              removedAt: null,
            },
          });
        const policy = canRemoveOrganizationMember({
          actorUserId: actor.id,
          targetUserId: target.userId,
          targetRole: target.role,
          activeHeadCount,
        });

        if (!policy.allowed) {
          throw new OrganizationActionError(
            policy.reason === "SELF_REMOVAL"
              ? "Не можна видалити самого себе без передачі керування."
              : "Не можна видалити останнього HEAD організації.",
          );
        }

        const removed = await tx.organizationMember.updateMany({
          where: {
            id: target.id,
            removedAt: null,
          },
          data: {
            removedAt: new Date(),
          },
        });

        if (removed.count !== 1) {
          throw new OrganizationActionError(
            "Учасника вже було видалено.",
          );
        }

        await tx.projectMember.deleteMany({
          where: {
            userId: target.userId,
            project: {
              organizationId: input.organizationId,
            },
          },
        });

        const remainingMemberships =
          await tx.organizationMember.count({
            where: {
              userId: target.userId,
              removedAt: null,
            },
          });

        if (remainingMemberships === 0) {
          await tx.user.update({
            where: { id: target.userId },
            data: {
              isActive: false,
              disabledAt: new Date(),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: "Користувача видалено з організації",
            entityType: "ORGANIZATION_MEMBER",
            entityId: target.id,
            userId: actor.id,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidateMembers();
    return { error: "", success: true };
  } catch (error) {
    return stateFromError(error);
  }
}

const projectMemberSchema = membershipMutationSchema.extend({
  projectId: idSchema,
});

export async function addMemberToProject(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      projectMemberSchema.safeParse({
        organizationId: formData.get("organizationId"),
        organizationMemberId: formData.get("organizationMemberId"),
        projectId: formData.get("projectId"),
      }),
    );
    const { user: actor } = await requireHeadOfOrganization(
      input.organizationId,
    );

    await prisma.$transaction(async (tx) => {
      const [member, project] = await Promise.all([
        tx.organizationMember.findFirst({
          where: {
            id: input.organizationMemberId,
            organizationId: input.organizationId,
            removedAt: null,
            user: { isActive: true },
          },
          select: { userId: true, role: true },
        }),
        tx.project.findFirst({
          where: {
            id: input.projectId,
            organizationId: input.organizationId,
          },
          select: { id: true, name: true },
        }),
      ]);

      if (!member || !project) {
        throw new OrganizationActionError(
          "Учасника або проєкт не знайдено.",
        );
      }

      const projectMembership = await tx.projectMember.upsert({
        where: {
          userId_projectId: {
            userId: member.userId,
            projectId: project.id,
          },
        },
        create: {
          userId: member.userId,
          projectId: project.id,
          role: member.role,
        },
        update: {
          role: member.role,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "Користувача додано до проєкту",
          entityType: "PROJECT_MEMBER",
          entityId: projectMembership.id,
          userId: actor.id,
          projectId: project.id,
        },
      });

      await createNotification(tx, {
        userId: member.userId,
        actorId: actor.id,
        type: NotificationType.PROJECT_MEMBER_ADDED,
        title: "Вас додано до проєкту",
        message: `Вас додано до проєкту «${project.name}».`,
        href: getNotificationHref({
          destination: "PROJECT",
          role: member.role,
          projectId: project.id,
        }),
        projectId: project.id,
      });
    });

    revalidateMembers();
    return { error: "", success: true };
  } catch (error) {
    return stateFromError(error);
  }
}

const removeProjectMemberSchema = z.object({
  organizationId: idSchema,
  projectMembershipId: idSchema,
});

export async function removeProjectMember(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      removeProjectMemberSchema.safeParse({
        organizationId: formData.get("organizationId"),
        projectMembershipId: formData.get("projectMembershipId"),
      }),
    );
    const { user: actor } = await requireHeadOfOrganization(
      input.organizationId,
    );

    await prisma.$transaction(async (tx) => {
      const membership = await tx.projectMember.findFirst({
        where: {
          id: input.projectMembershipId,
          project: {
            organizationId: input.organizationId,
          },
        },
        select: {
          id: true,
          userId: true,
          role: true,
          projectId: true,
          project: {
            select: { name: true },
          },
        },
      });

      if (!membership) {
        throw new OrganizationActionError(
          "Учасника проєкту не знайдено.",
        );
      }

      if (membership.role === "HEAD") {
        throw new OrganizationActionError(
          "HEAD не можна видалити з проєкту без окремої передачі керування.",
        );
      }

      await createNotification(tx, {
        userId: membership.userId,
        actorId: actor.id,
        type: NotificationType.PROJECT_MEMBER_REMOVED,
        title: "Вас видалено з проєкту",
        message: `Ваш доступ до проєкту «${membership.project.name}» припинено.`,
        href: null,
        projectId: membership.projectId,
      });

      await tx.projectMember.delete({
        where: { id: membership.id },
      });
      await tx.auditLog.create({
        data: {
          action: "Користувача видалено з проєкту",
          entityType: "PROJECT_MEMBER",
          entityId: membership.id,
          userId: actor.id,
          projectId: membership.projectId,
        },
      });
    });

    revalidateMembers();
    return { error: "", success: true };
  } catch (error) {
    return stateFromError(error);
  }
}

const roleChangeSchema = membershipMutationSchema.extend({
  role: memberRoleSchema,
});

export async function updateOrganizationMemberRole(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const input = getParsedData(
      roleChangeSchema.safeParse({
        organizationId: formData.get("organizationId"),
        organizationMemberId: formData.get("organizationMemberId"),
        role: formData.get("role"),
      }),
    );
    const { user: actor } = await requireHeadOfOrganization(
      input.organizationId,
    );

    await prisma.$transaction(
      async (tx) => {
        const target = await tx.organizationMember.findFirst({
          where: {
            id: input.organizationMemberId,
            organizationId: input.organizationId,
            removedAt: null,
          },
          select: {
            id: true,
            userId: true,
            role: true,
          },
        });

        if (!target) {
          throw new OrganizationActionError(
            "Учасника організації не знайдено.",
          );
        }

        const activeHeadCount =
          await tx.organizationMember.count({
            where: {
              organizationId: input.organizationId,
              role: "HEAD",
              removedAt: null,
            },
          });
        const policy = canChangeOrganizationRole({
          actorUserId: actor.id,
          targetUserId: target.userId,
          currentRole: target.role,
          nextRole: input.role,
          activeHeadCount,
        });

        if (!policy.allowed) {
          throw new OrganizationActionError(
            policy.reason === "SAME_ROLE"
              ? "Оберіть іншу роль."
              : "Не можна понизити останнього HEAD організації.",
          );
        }

        await tx.organizationMember.update({
          where: { id: target.id },
          data: { role: input.role },
        });
        await tx.user.update({
          where: { id: target.userId },
          data: { role: input.role },
        });
        await tx.projectMember.updateMany({
          where: {
            userId: target.userId,
            project: {
              organizationId: input.organizationId,
            },
          },
          data: { role: input.role },
        });
        await tx.auditLog.create({
          data: {
            action: "Роль користувача змінено",
            entityType: "ORGANIZATION_MEMBER",
            entityId: target.id,
            userId: actor.id,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    revalidateMembers();
    return { error: "", success: true };
  } catch (error) {
    return stateFromError(error);
  }
}
