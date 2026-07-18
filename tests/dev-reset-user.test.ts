import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DevResetSafetyError,
  resetDevUser,
  runDevResetCommand,
} from "@/lib/dev-reset-user";

const normalizedEmail = "user@example.com";

function testUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: normalizedEmail,
    passwordHash: null,
    accounts: [{ id: "account-1", provider: "google" }],
    memberships: [],
    organizationMemberships: [],
    sentInvitations: [],
    acceptedInvitations: [],
    documents: [],
    documentVersions: [],
    comments: [],
    createdCommentThreads: [],
    commentMessages: [],
    notifications: [],
    auditLogs: [],
    ...overrides,
  };
}

function createHarness(user = testUser()) {
  const tx = {
    user: { findFirst: vi.fn().mockResolvedValue(user), delete: vi.fn() },
    invitation: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailJob: { deleteMany: vi.fn() },
    account: { deleteMany: vi.fn() },
    projectMember: { deleteMany: vi.fn() },
    organizationMember: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn(), updateMany: vi.fn() },
    auditLog: { updateMany: vi.fn() },
    comment: { deleteMany: vi.fn() },
    organization: { deleteMany: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (callback) => callback(tx)),
  };
  return { tx, prisma };
}

describe("development user reset safety", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses production before creating a database client", async () => {
    const createPrisma = vi.fn();
    await expect(
      runDevResetCommand({
        args: [normalizedEmail],
        environment: {
          NODE_ENV: "production",
          ALLOW_DEV_DATABASE_RESET: "true",
        },
        createPrisma,
        output: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(DevResetSafetyError);
    expect(createPrisma).not.toHaveBeenCalled();
  });

  it("requires the explicit safety variable", async () => {
    const createPrisma = vi.fn();
    await expect(
      runDevResetCommand({
        args: [normalizedEmail],
        environment: { NODE_ENV: "development" },
        createPrisma,
        output: vi.fn(),
      }),
    ).rejects.toThrow("ALLOW_DEV_DATABASE_RESET=true");
    expect(createPrisma).not.toHaveBeenCalled();
  });

  it("rejects invalid email before creating a database client", async () => {
    const createPrisma = vi.fn();
    await expect(
      runDevResetCommand({
        args: ["not-an-email"],
        environment: {
          NODE_ENV: "development",
          ALLOW_DEV_DATABASE_RESET: "true",
        },
        createPrisma,
        output: vi.fn(),
      }),
    ).rejects.toThrow("valid email");
    expect(createPrisma).not.toHaveBeenCalled();
  });

  it("normalizes email, prints a dry-run plan, and performs no writes", async () => {
    const { tx, prisma } = createHarness();
    const onSummary = vi.fn();
    const summary = await resetDevUser({
      prisma: prisma as never,
      email: " USER@Example.COM ",
      dryRun: true,
      onSummary,
    });

    expect(tx.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
      }),
    );
    expect(summary.userKind).toBe("google");
    expect(onSummary).toHaveBeenCalledWith(summary);
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(tx.account.deleteMany).not.toHaveBeenCalled();
  });

  it('ignores the standalone "--" injected by pnpm while preserving --dry-run', async () => {
    const { tx, prisma } = createHarness();
    const disconnect = vi.fn();
    const output = vi.fn();

    await runDevResetCommand({
      args: ["--", normalizedEmail, "--dry-run"],
      environment: {
        NODE_ENV: "development",
        ALLOW_DEV_DATABASE_RESET: "true",
      },
      createPrisma: async () => ({
        ...prisma,
        $disconnect: disconnect,
      }) as never,
      output,
    });

    expect(output).toHaveBeenCalledWith({
      dryRun: true,
      summary: expect.objectContaining({ email: normalizedEmail }),
    });
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("resets a Google Account and its memberships without deleting shared entities", async () => {
    const { tx, prisma } = createHarness(
      testUser({
        memberships: [{ id: "project-membership" }],
        organizationMemberships: [
          {
            id: "organization-membership",
            role: "EXPERT",
            organization: {
              id: "shared-organization",
              projects: [{ id: "shared-project" }],
              members: [
                { userId: "user-1" },
                { userId: "other-user" },
              ],
              invitations: [],
            },
          },
        ],
      }),
    );

    const summary = await resetDevUser({
      prisma: prisma as never,
      email: normalizedEmail,
      dryRun: false,
      onSummary: vi.fn(),
    });

    expect(summary).toMatchObject({
      userKind: "google",
      projectMemberships: 1,
      organizationMemberships: 1,
      emptyOrganizationsDeleted: 0,
      sharedProjectsDeleted: 0,
      sharedDocumentsDeleted: 0,
    });
    expect(tx.account.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.projectMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.organization.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("recognizes credentials users", async () => {
    const { prisma } = createHarness(
      testUser({
        passwordHash: "password-hash",
        accounts: [],
      }),
    );
    const summary = await resetDevUser({
      prisma: prisma as never,
      email: normalizedEmail,
      dryRun: true,
      onSummary: vi.fn(),
    });
    expect(summary.userKind).toBe("credentials");
  });

  it("cleans invitation references, notifications, audit references, and comments transactionally", async () => {
    const { tx, prisma } = createHarness(
      testUser({
        acceptedInvitations: [{ id: "accepted-invitation" }],
        notifications: [{ id: "notification-1" }],
        auditLogs: [{ id: "audit-1" }],
        comments: [{ id: "comment-1" }],
      }),
    );
    tx.invitation.findMany.mockResolvedValue([{ id: "email-invitation" }]);
    const onSummary = vi.fn();

    const summary = await resetDevUser({
      prisma: prisma as never,
      email: normalizedEmail,
      dryRun: false,
      onSummary,
    });

    expect(summary).toMatchObject({
      invitationsDeleted: 1,
      acceptedInvitationReferencesCleared: 1,
      notificationsDeleted: 1,
      auditReferencesCleared: 1,
      commentsDeleted: 1,
    });
    expect(tx.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        acceptedById: "user-1",
        id: { notIn: ["email-invitation"] },
      },
      data: { acceptedById: null },
    });
    expect(tx.invitation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["email-invitation"] } },
    });
    expect(tx.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.auditLog.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { userId: null },
    });
    expect(tx.comment.deleteMany).toHaveBeenCalledWith({
      where: { authorId: "user-1" },
    });
    expect(onSummary.mock.invocationCallOrder[0]).toBeLessThan(
      tx.account.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it("removes an empty onboarding organization owned solely by the test HEAD", async () => {
    const { tx, prisma } = createHarness(
      testUser({
        organizationMemberships: [
          {
            id: "head-membership",
            role: "HEAD",
            organization: {
              id: "empty-organization",
              projects: [],
              members: [{ userId: "user-1" }],
              invitations: [],
            },
          },
        ],
      }),
    );

    const summary = await resetDevUser({
      prisma: prisma as never,
      email: normalizedEmail,
      dryRun: false,
      onSummary: vi.fn(),
    });
    expect(summary.emptyOrganizationsDeleted).toBe(1);
    expect(tx.organization.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["empty-organization"] },
        projects: { none: {} },
        members: { none: {} },
        invitations: { none: {} },
      },
    });
  });

  it("preserves an organization that has another member", async () => {
    const { tx, prisma } = createHarness(
      testUser({
        organizationMemberships: [
          {
            id: "head-membership",
            role: "HEAD",
            organization: {
              id: "shared-organization",
              projects: [],
              members: [{ userId: "user-1" }, { userId: "other-user" }],
              invitations: [],
            },
          },
        ],
      }),
    );
    await resetDevUser({
      prisma: prisma as never,
      email: normalizedEmail,
      dryRun: false,
      onSummary: vi.fn(),
    });
    expect(tx.organization.deleteMany).not.toHaveBeenCalled();
  });

  it("blocks deletion instead of cascading into shared documents", async () => {
    const { tx, prisma } = createHarness(
      testUser({ documents: [{ id: "shared-document" }] }),
    );
    await expect(
      resetDevUser({
        prisma: prisma as never,
        email: normalizedEmail,
        dryRun: false,
        onSummary: vi.fn(),
      }),
    ).rejects.toThrow("authors 1 document");
    expect(tx.user.delete).not.toHaveBeenCalled();
  });
});
