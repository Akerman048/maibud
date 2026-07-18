import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma, UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  userCreate: vi.fn(),
  organizationCreate: vi.fn(),
  organizationMemberCreate: vi.fn(),
  auditLogCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  invitationFindUnique: vi.fn(),
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
vi.mock("server-only", () => ({}));

import {
  registerOrganization,
  RegistrationEmailConflictError,
  completeGoogleOrganizationRegistration,
  GoogleOnboardingError,
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
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({ id: "user-1" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          create: mocks.userCreate,
          findUnique: mocks.userFindUnique,
          update: mocks.userUpdate,
        },
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

describe("completeGoogleOrganizationRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({
      id: "google-user",
      email: "google@example.com",
      isActive: true,
      passwordHash: null,
      role: UserRole.DESIGNER,
      accounts: [{ id: "google-account" }],
      organizationMemberships: [],
    });
    mocks.organizationCreate.mockResolvedValue({ id: "organization-1" });
    mocks.userUpdate.mockResolvedValue({ id: "google-user" });
    mocks.organizationMemberCreate.mockResolvedValue({ id: "membership-1" });
    mocks.auditLogCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          findUnique: mocks.userFindUnique,
          update: mocks.userUpdate,
        },
        organization: { create: mocks.organizationCreate },
        organizationMember: { create: mocks.organizationMemberCreate },
        invitation: { findUnique: mocks.invitationFindUnique },
        auditLog: { create: mocks.auditLogCreate },
      }),
    );
  });

  it("atomically creates the organization, trusted HEAD membership and audit", async () => {
    await expect(
      completeGoogleOrganizationRegistration({
        userId: "google-user",
        organizationName: "Google Organization",
      }),
    ).resolves.toEqual({ organizationId: "organization-1", created: true });

    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "google-user" },
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
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "google-user" },
      data: { role: UserRole.HEAD },
    });
    expect(mocks.organizationMemberCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "organization-1",
        userId: "google-user",
        role: UserRole.HEAD,
      },
    });
    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: {
        action: "Завершено реєстрацію через Google",
        entityType: "Organization",
        entityId: "organization-1",
        userId: "google-user",
      },
    });
    expect(mocks.organizationCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.organizationMemberCreate.mock.invocationCallOrder[0],
    );
    expect(
      mocks.organizationMemberCreate.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.userUpdate.mock.invocationCallOrder[0]);
    expect(mocks.userUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.auditLogCreate.mock.invocationCallOrder[0],
    );
  });

  it("rejects onboarding after an active membership exists", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "google-user",
      isActive: true,
      accounts: [{ id: "google-account" }],
      organizationMemberships: [{ organizationId: "existing-organization" }],
    });

    await expect(
      completeGoogleOrganizationRegistration({
        userId: "google-user",
        organizationName: "Ignored",
      }),
    ).rejects.toBeInstanceOf(GoogleOnboardingError);
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.organizationMemberCreate).not.toHaveBeenCalled();
  });

  it("rejects an invitation-associated Google flow before creating an organization", async () => {
    mocks.invitationFindUnique.mockResolvedValue({ id: "invitation-1" });

    await expect(
      completeGoogleOrganizationRegistration({
        userId: "google-user",
        organizationName: "Must Not Exist",
        invitationToken: "a".repeat(43),
      }),
    ).rejects.toMatchObject({ message: "Invitation flow required" });
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.organizationMemberCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a partial non-Google user and leaves no organization", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "credentials-user",
      isActive: true,
      accounts: [],
      organizationMemberships: [],
    });

    await expect(
      completeGoogleOrganizationRegistration({
        userId: "credentials-user",
        organizationName: "Unauthorized",
      }),
    ).rejects.toBeInstanceOf(GoogleOnboardingError);
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
  });

  it("rejects an inactive Google user before any onboarding write", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "inactive-google-user",
      isActive: false,
      accounts: [{ id: "google-account" }],
      organizationMemberships: [],
    });

    await expect(
      completeGoogleOrganizationRegistration({
        userId: "inactive-google-user",
        organizationName: "Must Not Exist",
      }),
    ).rejects.toBeInstanceOf(GoogleOnboardingError);
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.organizationMemberCreate).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it("propagates transaction failure without continuing to membership or audit", async () => {
    mocks.organizationCreate.mockRejectedValue(new Error("database unavailable"));

    await expect(
      completeGoogleOrganizationRegistration({
        userId: "google-user",
        organizationName: "Google Organization",
      }),
    ).rejects.toThrow("database unavailable");
    expect(mocks.organizationMemberCreate).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });
});
