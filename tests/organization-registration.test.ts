import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma, UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  userCreate: vi.fn(),
  organizationCreate: vi.fn(),
  organizationMemberCreate: vi.fn(),
  auditLogCreate: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: mocks.hashPassword,
}));

import {
  registerOrganization,
  RegistrationEmailConflictError,
} from "@/lib/organization-registration";

const registration = {
  firstName: "Сергій",
  lastName: "Петренко",
  email: "owner@example.com",
  password: "Secure123",
  confirmPassword: "Secure123",
  organizationName: "МайБуд Проєкт",
  termsAccepted: true,
};

function uniqueConstraintError(target?: unknown) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: target === undefined ? undefined : { target },
  });
}

describe("registerOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.userCreate.mockResolvedValue({ id: "user-1" });
    mocks.organizationCreate.mockResolvedValue({ id: "organization-1" });
    mocks.organizationMemberCreate.mockResolvedValue({ id: "membership-1" });
    mocks.auditLogCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { create: mocks.userCreate },
        organization: { create: mocks.organizationCreate },
        organizationMember: { create: mocks.organizationMemberCreate },
        auditLog: { create: mocks.auditLogCreate },
      }),
    );
  });

  it("creates the HEAD owner, organization, membership and audit log in one transaction", async () => {
    await expect(registerOrganization(registration)).resolves.toEqual({
      userId: "user-1",
      organizationId: "organization-1",
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        email: {
          equals: "owner@example.com",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        name: "Сергій Петренко",
        email: "owner@example.com",
        passwordHash: "hashed-password",
        role: UserRole.HEAD,
      },
      select: { id: true },
    });
    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: { name: "МайБуд Проєкт" },
      select: { id: true },
    });
    expect(mocks.organizationMemberCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "organization-1",
        userId: "user-1",
        role: UserRole.HEAD,
      },
    });
    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: {
        action: "Створено організацію",
        entityType: "Organization",
        entityId: "organization-1",
        userId: "user-1",
      },
    });
  });

  it("rejects an email that already exists before hashing or transaction", async () => {
    mocks.findFirst.mockResolvedValue({ id: "existing-user" });

    await expect(registerOrganization(registration)).rejects.toBeInstanceOf(
      RegistrationEmailConflictError,
    );
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("propagates a transaction failure and does not continue to the audit log", async () => {
    mocks.organizationMemberCreate.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(registerOrganization(registration)).rejects.toThrow(
      "database unavailable",
    );
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it.each([
    [["email"]],
    ["email"],
    ["User_email_key"],
  ])("maps an email P2002 target %j to a registration conflict", async (target) => {
    mocks.transaction.mockRejectedValue(uniqueConstraintError(target));

    await expect(registerOrganization(registration)).rejects.toBeInstanceOf(
      RegistrationEmailConflictError,
    );
  });

  it.each([
    [["organizationId", "userId"]],
    ["organizationId_email_key"],
    ["User_alternate_email_key"],
    [{ field: "email" }],
    [undefined],
  ])("rethrows a non-email P2002 target %j", async (target) => {
    const error = uniqueConstraintError(target);
    mocks.transaction.mockRejectedValue(error);

    await expect(registerOrganization(registration)).rejects.toBe(error);
  });
});
