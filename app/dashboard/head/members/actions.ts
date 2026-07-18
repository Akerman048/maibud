"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import {
  NotificationType,
  Prisma,
  ProjectStatus,
  UserRole,
} from "@/app/generated/prisma/client";
import { AuthorizationError } from "@/lib/auth-guard";
import {
  createOrganizationInvitation,
  InvitationLifecycleError,
  revokeOrganizationInvitation,
  rotateOrganizationInvitation,
} from "@/lib/invitation-service";
import { checkInvitationRateLimit } from "@/lib/invitation-rate-limit";
import {
  createInvitationInputSchema,
  invitationMutationSchema,
} from "@/lib/invitation-validation";
import {
  canChangeOrganizationRole,
  canRemoveOrganizationMember,
} from "@/lib/membership-policy";
import {
  requireCurrentHeadOrganization,
  requireHeadOfOrganization,
} from "@/lib/organization-access";
import { getNotificationHref } from "@/lib/notification-policy";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getTrustedClientIp } from "@/lib/process-rate-limit";
import type { OrganizationActionState } from "@/types/organization";

class OrganizationActionError extends Error {}

const idSchema = z.string().trim().min(1, "Не вказано ідентифікатор.");
const memberRoleSchema = z.enum([
  UserRole.HEAD,
  UserRole.EXPERT,
  UserRole.DESIGNER,
  UserRole.ARCHIVIST,
  UserRole.CLIENT,
]);

function revalidateMembers() {
  revalidatePath("/dashboard/head/members");
}

function stateFromError(error: unknown): OrganizationActionState {
  if (error instanceof OrganizationActionError) {
    return { error: error.message, success: false };
  }

  if (error instanceof InvitationLifecycleError) {
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

async function enforceInvitationRateLimit(
  operation: "create" | "resend" | "revoke",
) {
  const clientIp = getTrustedClientIp(await headers());
  const result = checkInvitationRateLimit(operation, clientIp);

  if (!result.allowed) {
    throw new OrganizationActionError(
      `Забагато спроб. Повторіть через ${result.retryAfterSeconds} с.`,
    );
  }
}

export async function createInvitation(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    await enforceInvitationRateLimit("create");
    const input = getParsedData(
      createInvitationInputSchema.safeParse({
        email: formData.get("email"),
        role: formData.get("role"),
        projectId: formData.get("projectId"),
      }),
    );
    const current = await requireCurrentHeadOrganization();
    const result = await createOrganizationInvitation({
      context: {
        actorId: current.user.id,
        actorEmail: current.actorEmail,
        organizationId: current.organization.id,
      },
      ...input,
    });

    revalidateMembers();

    return {
      error: "",
      success: true,
      inviteUrl: result.inviteUrl,
    };
  } catch (error) {
    return stateFromError(error);
  }
}

export async function revokeInvitation(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    await enforceInvitationRateLimit("revoke");
    const input = getParsedData(
      invitationMutationSchema.safeParse({
        invitationId: formData.get("invitationId"),
      }),
    );
    const current = await requireCurrentHeadOrganization();
    await revokeOrganizationInvitation({
      context: {
        actorId: current.user.id,
        actorEmail: current.actorEmail,
        organizationId: current.organization.id,
      },
      invitationId: input.invitationId,
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
    await enforceInvitationRateLimit("resend");
    const input = getParsedData(
      invitationMutationSchema.safeParse({
        invitationId: formData.get("invitationId"),
      }),
    );
    const current = await requireCurrentHeadOrganization();
    const result = await rotateOrganizationInvitation({
      context: {
        actorId: current.user.id,
        actorEmail: current.actorEmail,
        organizationId: current.organization.id,
      },
      invitationId: input.invitationId,
    });

    revalidateMembers();
    return {
      error: "",
      success: true,
      inviteUrl: result.inviteUrl,
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
      const member = await tx.organizationMember.findFirst({
          where: {
            id: input.organizationMemberId,
            organizationId: input.organizationId,
            removedAt: null,
            user: { isActive: true },
          },
          select: { userId: true, role: true },
        });
      const project = await tx.project.findFirst({
          where: {
            id: input.projectId,
            organizationId: input.organizationId,
            status: { not: ProjectStatus.ARCHIVED },
          },
          select: { id: true, name: true },
        });

      if (!member || !project) {
        throw new OrganizationActionError(
          "Учасника або проєкт не знайдено.",
        );
      }

      const projectGuard = await tx.project.updateMany({
        where: {
          id: project.id,
          organizationId: input.organizationId,
          status: { not: ProjectStatus.ARCHIVED },
        },
        data: { updatedAt: new Date() },
      });
      if (projectGuard.count !== 1) {
        throw new OrganizationActionError(
          "Архівний проєкт доступний лише для читання.",
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
            status: { not: ProjectStatus.ARCHIVED },
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

      const removed = await tx.projectMember.deleteMany({
        where: {
          id: membership.id,
          project: {
            status: { not: ProjectStatus.ARCHIVED },
            organizationId: input.organizationId,
          },
        },
      });
      if (removed.count !== 1) {
        throw new OrganizationActionError(
          "Архівний проєкт доступний лише для читання.",
        );
      }
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

        const conflictingActiveMembership =
          await tx.organizationMember.findFirst({
            where: {
              userId: target.userId,
              organizationId: { not: input.organizationId },
              removedAt: null,
              role: { not: input.role },
            },
            select: { id: true },
          });
        if (conflictingActiveMembership) {
          throw new OrganizationActionError(
            "Роль конфліктує з активним членством в іншій організації.",
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
