import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { RegistrationInput } from "@/lib/registration-validation";

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
