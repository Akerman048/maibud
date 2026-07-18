import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { RegistrationInput } from "@/lib/registration-validation";
import { hashInvitationToken } from "@/lib/invitations";

export class RegistrationEmailConflictError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "RegistrationEmailConflictError";
  }
}

function isEmailUniqueConstraintError(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.length === 1 && target[0] === "email";
  }

  return target === "email" || target === "User_email_key";
}

export async function registerOrganization(input: RegistrationInput) {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: input.email,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new RegistrationEmailConflictError();
  }

  const passwordHash = await hashPassword(input.password);
  const fullName = `${input.firstName} ${input.lastName}`;

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email: input.email,
          passwordHash,
          role: UserRole.HEAD,
        },
        select: { id: true },
      });

      const organization = await tx.organization.create({
        data: { name: input.organizationName },
        select: { id: true },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: UserRole.HEAD,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "Створено організацію",
          entityType: "Organization",
          entityId: organization.id,
          userId: user.id,
        },
      });

      return {
        userId: user.id,
        organizationId: organization.id,
      };
    });
  } catch (error) {
    if (isEmailUniqueConstraintError(error)) {
      throw new RegistrationEmailConflictError();
    }

    throw error;
  }
}

export class GoogleOnboardingError extends Error {
  constructor(
    message:
      | "Active membership exists"
      | "Google account required"
      | "Inactive user"
      | "Invitation flow required"
      | "Invalid onboarding role"
      | "User not found",
  ) {
    super(message);
    this.name = "GoogleOnboardingError";
  }
}

export async function completeGoogleOrganizationRegistration({
  userId,
  organizationName,
  invitationToken,
}: {
  userId: string;
  organizationName: string;
  invitationToken?: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isActive: true,
          passwordHash: true,
          role: true,
          accounts: {
            where: { provider: "google" },
            select: { id: true },
            take: 1,
          },
          organizationMemberships: {
            where: { removedAt: null },
            select: { organizationId: true },
            take: 1,
          },
        },
      });

      if (!user) throw new GoogleOnboardingError("User not found");
      if (!user.isActive) throw new GoogleOnboardingError("Inactive user");
      if (invitationToken) {
        const invitation = await tx.invitation.findUnique({
          where: { tokenHash: hashInvitationToken(invitationToken) },
          select: { id: true },
        });
        if (invitation) {
          throw new GoogleOnboardingError("Invitation flow required");
        }
      }
      if (!user.accounts.length) {
        throw new GoogleOnboardingError("Google account required");
      }
      if (user.organizationMemberships.length) {
        throw new GoogleOnboardingError("Active membership exists");
      }
      if (user.role !== UserRole.DESIGNER || user.passwordHash !== null) {
        throw new GoogleOnboardingError("Invalid onboarding role");
      }

      const organization = await tx.organization.create({
        data: { name: organizationName },
        select: { id: true },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: UserRole.HEAD,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { role: UserRole.HEAD },
      });
      await tx.auditLog.create({
        data: {
          action: "Завершено реєстрацію через Google",
          entityType: "Organization",
          entityId: organization.id,
          userId,
        },
      });

      return { organizationId: organization.id, created: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
