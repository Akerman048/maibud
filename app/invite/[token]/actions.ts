"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import {
  hashInvitationToken,
  normalizeInvitationEmail,
} from "@/lib/invitations";
import { canApplyInvitationRole } from "@/lib/membership-policy";
import { prisma } from "@/lib/prisma";

export type AcceptInvitationState = {
  error: string;
  success: boolean;
};

class AcceptInvitationError extends Error {}

const tokenSchema = z.string().trim().min(20);
const registrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Ім’я має містити щонайменше 2 символи.")
      .max(100, "Ім’я не може перевищувати 100 символів."),
    password: z
      .string()
      .min(10, "Пароль має містити щонайменше 10 символів.")
      .max(128, "Пароль не може перевищувати 128 символів.")
      .regex(/[A-Z]/, "Пароль має містити велику літеру.")
      .regex(/[a-z]/, "Пароль має містити малу літеру.")
      .regex(/[0-9]/, "Пароль має містити цифру."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролі не збігаються.",
    path: ["confirmPassword"],
  });

function getAcceptanceError(error: unknown): AcceptInvitationState {
  if (error instanceof AcceptInvitationError) {
    return { error: error.message, success: false };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      error:
        "Обліковий запис із цим email уже існує. Увійдіть і відкрийте запрошення повторно.",
      success: false,
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return {
      error:
        "Запрошення вже змінилося. Оновіть сторінку та повторіть дію.",
      success: false,
    };
  }

  console.error("Invitation acceptance failed", error);

  return {
    error: "Не вдалося прийняти запрошення.",
    success: false,
  };
}

export async function acceptInvitation(
  _previousState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  let redirectTo: string;

  try {
    const tokenResult = tokenSchema.safeParse(formData.get("token"));

    if (!tokenResult.success) {
      throw new AcceptInvitationError("Запрошення недійсне.");
    }

    const session = await auth();
    const tokenHash = hashInvitationToken(tokenResult.data);
    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organizationId: true,
        projectId: true,
      },
    });

    if (!invitation) {
      throw new AcceptInvitationError("Запрошення недійсне.");
    }

    if (invitation.status === "REVOKED") {
      throw new AcceptInvitationError("Запрошення було відкликано.");
    }

    if (invitation.status === "ACCEPTED") {
      throw new AcceptInvitationError("Запрошення вже використано.");
    }

    if (
      invitation.status === "EXPIRED" ||
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      throw new AcceptInvitationError("Термін дії запрошення минув.");
    }

    let existingUserId: string | null = null;
    let newUserData:
      | { name: string; passwordHash: string }
      | undefined;

    if (session?.user) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });

      if (!currentUser?.isActive) {
        throw new AcceptInvitationError(
          "Цей обліковий запис деактивовано.",
        );
      }

      if (
        normalizeInvitationEmail(currentUser.email) !==
        invitation.email
      ) {
        throw new AcceptInvitationError(
          "Email поточного облікового запису не збігається із запрошенням.",
        );
      }

      existingUserId = currentUser.id;
      redirectTo = "/dashboard";
    } else {
      const registrationResult = registrationSchema.safeParse({
        name: formData.get("name"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
      });

      if (!registrationResult.success) {
        throw new AcceptInvitationError(
          registrationResult.error.issues[0]?.message ??
            "Некоректні дані реєстрації.",
        );
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: invitation.email,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new AcceptInvitationError(
          "Обліковий запис уже існує. Увійдіть і відкрийте запрошення повторно.",
        );
      }

      newUserData = {
        name: registrationResult.data.name,
        passwordHash: await hash(registrationResult.data.password, 12),
      };
      redirectTo = "/login?invitationAccepted=1";
    }

    await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const claimed = await tx.invitation.updateMany({
          where: {
            id: invitation.id,
            tokenHash,
            status: "PENDING",
            expiresAt: { gt: now },
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: now,
          },
        });

        if (claimed.count !== 1) {
          throw new AcceptInvitationError(
            "Запрошення вже використано, відкликано або його термін минув.",
          );
        }

        let acceptedUserId = existingUserId;

        if (!acceptedUserId && newUserData) {
          const newUser = await tx.user.create({
            data: {
              name: newUserData.name,
              email: invitation.email,
              passwordHash: newUserData.passwordHash,
              role: invitation.role,
              isActive: true,
            },
            select: { id: true },
          });
          acceptedUserId = newUser.id;
        }

        if (!acceptedUserId) {
          throw new AcceptInvitationError(
            "Не вдалося визначити користувача запрошення.",
          );
        }

        if (existingUserId) {
          const compatibilityUser = await tx.user.findUnique({
            where: { id: existingUserId },
            select: {
              role: true,
              organizationMemberships: {
                where: {
                  removedAt: null,
                  organizationId: {
                    not: invitation.organizationId,
                  },
                },
                take: 1,
                select: { id: true },
              },
            },
          });

          if (
            !compatibilityUser ||
            !canApplyInvitationRole({
              currentGlobalRole: compatibilityUser.role,
              invitationRole: invitation.role,
              hasOtherActiveOrganizationMemberships:
                compatibilityUser.organizationMemberships.length > 0,
            })
          ) {
            throw new AcceptInvitationError(
              "Роль запрошення конфліктує з активною роллю в іншій організації. Зверніться до адміністратора.",
            );
          }
        }

        await tx.user.update({
          where: { id: acceptedUserId },
          data: {
            role: invitation.role,
            isActive: true,
            disabledAt: null,
          },
        });

        const organizationMembership =
          await tx.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: invitation.organizationId,
                userId: acceptedUserId,
              },
            },
            create: {
              organizationId: invitation.organizationId,
              userId: acceptedUserId,
              role: invitation.role,
            },
            update: {
              role: invitation.role,
              removedAt: null,
              joinedAt: now,
            },
          });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedById: acceptedUserId },
        });

        await tx.auditLog.createMany({
          data: [
            {
              action: "Запрошення прийнято",
              entityType: "INVITATION",
              entityId: invitation.id,
              userId: acceptedUserId,
              projectId: invitation.projectId,
            },
            {
              action: "Користувача додано до організації",
              entityType: "ORGANIZATION_MEMBER",
              entityId: organizationMembership.id,
              userId: acceptedUserId,
            },
          ],
        });

        if (invitation.projectId) {
          const project = await tx.project.findFirst({
            where: {
              id: invitation.projectId,
              organizationId: invitation.organizationId,
            },
            select: { id: true },
          });

          if (!project) {
            throw new AcceptInvitationError(
              "Проєкт запрошення більше не існує.",
            );
          }

          const projectMembership = await tx.projectMember.upsert({
            where: {
              userId_projectId: {
                userId: acceptedUserId,
                projectId: project.id,
              },
            },
            create: {
              userId: acceptedUserId,
              projectId: project.id,
              role: invitation.role,
            },
            update: { role: invitation.role },
          });

          await tx.auditLog.create({
            data: {
              action: "Користувача додано до проєкту",
              entityType: "PROJECT_MEMBER",
              entityId: projectMembership.id,
              userId: acceptedUserId,
              projectId: project.id,
            },
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    return getAcceptanceError(error);
  }

  redirect(redirectTo);
}
