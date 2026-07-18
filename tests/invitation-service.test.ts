import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  invitationFindUnique: vi.fn(),
  invitationFindFirst: vi.fn(),
  invitationUpdateMany: vi.fn(),
  invitationCreate: vi.fn(),
  organizationMemberFindFirst: vi.fn(),
  organizationMemberFindUnique: vi.fn(),
  organizationMemberUpsert: vi.fn(),
  organizationFindUnique: vi.fn(),
  projectFindFirst: vi.fn(),
  projectMemberUpsert: vi.fn(),
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  auditCreate: vi.fn(),
  auditCreateMany: vi.fn(),
  createNotification: vi.fn(),
  cancelPendingInvitationEmailJobs: vi.fn(),
  createInvitationEmailJob: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: { findUnique: mocks.invitationFindUnique },
    user: { findFirst: mocks.userFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/notifications", () => ({
  createNotification: mocks.createNotification,
}));
vi.mock("@/lib/email/email-jobs", () => ({
  cancelPendingInvitationEmailJobs: mocks.cancelPendingInvitationEmailJobs,
  createInvitationEmailJob: mocks.createInvitationEmailJob,
}));

import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  inspectOrganizationInvitation,
  revokeOrganizationInvitation,
  rotateOrganizationInvitation,
} from "@/lib/invitation-service";
import { hashInvitationToken } from "@/lib/invitations";

const now = new Date("2026-07-17T12:00:00.000Z");
const context = {
  actorId: "head-1",
  actorEmail: "head@example.com",
  organizationId: "organization-1",
};

const pendingInvitation = {
  id: "invitation-1",
  email: "expert@example.com",
  role: "EXPERT",
  status: "PENDING",
  acceptedAt: null,
  revokedAt: null,
  expiresAt: new Date("2026-07-18T12:00:00.000Z"),
  organizationId: "organization-1",
  projectId: null,
  invitedById: "head-1",
};

function transactionClient() {
  return {
    invitation: {
      findUnique: mocks.invitationFindUnique,
      findFirst: mocks.invitationFindFirst,
      updateMany: mocks.invitationUpdateMany,
      create: mocks.invitationCreate,
    },
    organizationMember: {
      findFirst: mocks.organizationMemberFindFirst,
      findUnique: mocks.organizationMemberFindUnique,
      upsert: mocks.organizationMemberUpsert,
    },
    organization: { findUnique: mocks.organizationFindUnique },
    project: { findFirst: mocks.projectFindFirst },
    projectMember: { upsert: mocks.projectMemberUpsert },
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    auditLog: {
      create: mocks.auditCreate,
      createMany: mocks.auditCreateMany,
    },
  };
}

describe("secure invitation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transactionClient()),
    );
    mocks.organizationMemberFindFirst.mockResolvedValue(null);
    mocks.organizationMemberFindUnique.mockResolvedValue(null);
    mocks.invitationFindFirst.mockResolvedValue(null);
    mocks.invitationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.invitationCreate.mockResolvedValue({
      id: "invitation-1",
      expiresAt: new Date("2026-07-20T12:00:00.000Z"),
    });
    mocks.organizationMemberUpsert.mockResolvedValue({ id: "membership-1" });
    mocks.organizationFindUnique.mockResolvedValue({ name: "Secure Organization" });
    mocks.userFindFirst.mockResolvedValue({ id: "expert-1" });
    mocks.projectMemberUpsert.mockResolvedValue({ id: "project-membership-1" });
    mocks.userFindUnique.mockResolvedValue({
      id: "expert-1",
      email: "Expert@Example.com",
      name: "Expert User",
      role: "EXPERT",
      isActive: true,
      organizationMemberships: [],
    });
  });

  it("creates a hashed, expiring invitation in the trusted organization with audit", async () => {
    const result = await createOrganizationInvitation({
      context,
      email: "expert@example.com",
      role: "EXPERT",
      now,
    });

    const createInput = mocks.invitationCreate.mock.calls[0][0].data;
    const rawToken = result.inviteUrl.replace("/invite/", "");
    expect(createInput).toMatchObject({
      email: "expert@example.com",
      organizationId: "organization-1",
      invitedById: "head-1",
      role: "EXPERT",
    });
    expect(createInput).not.toHaveProperty("token");
    expect(createInput.tokenHash).toBe(hashInvitationToken(rawToken));
    expect(createInput.tokenHash).not.toBe(rawToken);
    expect(createInput.expiresAt.toISOString()).toBe("2026-07-20T12:00:00.000Z");
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "Створено запрошення користувача",
          entityId: "invitation-1",
          userId: "head-1",
        }),
      }),
    );
    expect(mocks.createInvitationEmailJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        invitationId: "invitation-1",
        href: result.inviteUrl,
        recipientEmail: "expert@example.com",
      }),
    );
  });

  it("rejects inviting the current user before opening a transaction", async () => {
    await expect(
      createOrganizationInvitation({
        context,
        email: "head@example.com",
        role: "EXPERT",
        now,
      }),
    ).rejects.toMatchObject({ code: "SELF_INVITATION" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an existing active member", async () => {
    mocks.organizationMemberFindFirst.mockResolvedValue({ id: "membership-1" });
    await expect(
      createOrganizationInvitation({ context, email: "expert@example.com", role: "EXPERT", now }),
    ).rejects.toMatchObject({ code: "ACTIVE_MEMBER" });
    expect(mocks.invitationCreate).not.toHaveBeenCalled();
  });

  it("expires stale invitations and rejects a duplicate active pending invitation", async () => {
    mocks.invitationFindFirst.mockResolvedValue({ id: "existing-invitation" });
    await expect(
      createOrganizationInvitation({ context, email: "expert@example.com", role: "EXPERT", now }),
    ).rejects.toMatchObject({ code: "PENDING_EXISTS" });
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "organization-1" }),
        data: { status: "EXPIRED" },
      }),
    );
  });

  it("scopes an optional project to the trusted organization", async () => {
    mocks.projectFindFirst.mockResolvedValue(null);
    await expect(
      createOrganizationInvitation({
        context,
        email: "expert@example.com",
        role: "EXPERT",
        projectId: "foreign-project",
        now,
      }),
    ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    expect(mocks.projectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "organization-1" }),
      }),
    );
  });

  it("returns only safe inspection data for a valid token", async () => {
    mocks.invitationFindUnique.mockResolvedValue({
      ...pendingInvitation,
      organization: { name: "Secure Organization" },
      project: null,
    });

    const result = await inspectOrganizationInvitation("a".repeat(43));
    expect(result).toEqual({
      status: "valid",
      organizationName: "Secure Organization",
      role: "EXPERT",
      email: "ex••••@example.com",
      expiresAt: "2026-07-18T12:00:00.000Z",
      projectName: null,
      viewerStatus: "unauthenticated-existing",
    });
    expect(result).not.toHaveProperty("tokenHash");
    expect(result).not.toHaveProperty("invitedById");
  });

  it.each([
    ["a@例え.テスト", "a•••@例え.テスト"],
    ["invalid-legacy-value", "•••"],
  ])("masks unusual or malformed stored email %s without exposing identifiers", async (email, masked) => {
    mocks.invitationFindUnique.mockResolvedValue({
      ...pendingInvitation,
      email,
      organization: { name: "Org" },
      project: null,
    });
    mocks.userFindFirst.mockResolvedValue(null);

    const result = await inspectOrganizationInvitation("a".repeat(43));
    expect(result).toMatchObject({
      status: "valid",
      email: masked,
      viewerStatus: "unauthenticated-new",
    });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("organizationId");
  });

  it("distinguishes matching and wrong authenticated viewers without exposing raw email", async () => {
    mocks.invitationFindUnique.mockResolvedValue({
      ...pendingInvitation,
      organization: { name: "Org" },
      project: null,
    });

    await expect(
      inspectOrganizationInvitation("a".repeat(43), "EXPERT@example.com"),
    ).resolves.toMatchObject({ viewerStatus: "authenticated-matching" });
    await expect(
      inspectOrganizationInvitation("a".repeat(43), "other@example.com"),
    ).resolves.toMatchObject({ viewerStatus: "authenticated-wrong" });
  });

  it.each([
    [null, "invalid"],
    [{ ...pendingInvitation, status: "ACCEPTED", acceptedAt: now }, "accepted"],
    [{ ...pendingInvitation, status: "REVOKED", revokedAt: now }, "revoked"],
    [{ ...pendingInvitation, expiresAt: new Date("2026-07-16T12:00:00.000Z") }, "expired"],
  ])("reports safe inspection status %s", async (invitation, status) => {
    mocks.invitationFindUnique.mockResolvedValue(
      invitation ? { ...invitation, organization: { name: "Org" }, project: null } : null,
    );
    await expect(inspectOrganizationInvitation("a".repeat(43))).resolves.toEqual({ status });
  });

  it("accepts atomically, creates membership, marks acceptedBy, and audits", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);

    const result = await acceptOrganizationInvitation({
      token: "a".repeat(43),
      userId: "expert-1",
      now,
    });

    expect(result.membershipAlreadyActive).toBe(false);
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACCEPTED",
          acceptedById: "expert-1",
          acceptedAt: now,
        }),
      }),
    );
    expect(mocks.organizationMemberUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreateMany).toHaveBeenCalledTimes(1);
    expect(mocks.createNotification).toHaveBeenCalledTimes(1);
    expect(mocks.cancelPendingInvitationEmailJobs).toHaveBeenCalledWith(
      expect.anything(),
      "invitation-1",
    );
  });

  it("rejects acceptance by a different normalized email before claiming", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.userFindUnique.mockResolvedValue({
      id: "other-user",
      email: "other@example.com",
      name: "Other",
      role: "EXPERT",
      isActive: true,
      organizationMemberships: [],
    });
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "other-user", now }),
    ).rejects.toMatchObject({ code: "EMAIL_MISMATCH" });
    expect(mocks.invitationUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects an unknown token and an inactive account", async () => {
    mocks.invitationFindUnique.mockResolvedValue(null);
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toMatchObject({ code: "INVALID" });

    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.userFindUnique.mockResolvedValue({
      id: "expert-1",
      email: "expert@example.com",
      name: "User",
      role: "EXPERT",
      isActive: false,
      organizationMemberships: [],
    });
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toMatchObject({ code: "USER_INACTIVE" });
  });

  it.each([
    [{ ...pendingInvitation, status: "ACCEPTED", acceptedAt: now }, "ACCEPTED"],
    [{ ...pendingInvitation, status: "REVOKED", revokedAt: now }, "REVOKED"],
    [{ ...pendingInvitation, expiresAt: new Date("2026-07-16T12:00:00.000Z") }, "EXPIRED"],
  ])("rejects consumed invitation state", async (invitation, code) => {
    mocks.invitationFindUnique.mockResolvedValue(invitation);
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toMatchObject({ code });
  });

  it("consumes safely without duplicating an existing active membership", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.organizationMemberFindUnique.mockResolvedValue({
      id: "membership-existing",
      role: "EXPERT",
      removedAt: null,
    });
    const result = await acceptOrganizationInvitation({
      token: "a".repeat(43),
      userId: "expert-1",
      now,
    });
    expect(result.membershipAlreadyActive).toBe(true);
    expect(mocks.organizationMemberUpsert).not.toHaveBeenCalled();
    expect(mocks.auditCreateMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it("does not create membership when another concurrent claim wins", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.invitationUpdateMany.mockResolvedValue({ count: 0 });
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
    expect(mocks.organizationMemberUpsert).not.toHaveBeenCalled();
  });

  it("rejects a different global role when another organization is active", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.userFindUnique.mockResolvedValue({
      id: "expert-1",
      email: "expert@example.com",
      name: "User",
      role: "DESIGNER",
      isActive: true,
      organizationMemberships: [{ id: "other-membership" }],
    });
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toMatchObject({ code: "ROLE_CONFLICT" });
    expect(mocks.invitationUpdateMany).not.toHaveBeenCalled();
  });

  it("updates a different global role when no other active organization exists", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.userFindUnique.mockResolvedValue({
      id: "expert-1",
      email: "expert@example.com",
      name: "User",
      role: "DESIGNER",
      isActive: true,
      organizationMemberships: [],
    });

    const result = await acceptOrganizationInvitation({
      token: "a".repeat(43),
      userId: "expert-1",
      now,
    });

    expect(result.roleChanged).toBe(true);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "expert-1" },
      data: { role: "EXPERT" },
    });
  });

  it("rolls back the transactional lifecycle when a scoped project is gone", async () => {
    mocks.invitationFindUnique.mockResolvedValue({
      ...pendingInvitation,
      projectId: "project-1",
    });
    mocks.projectFindFirst.mockResolvedValue(null);
    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreateMany).not.toHaveBeenCalled();
  });

  it("keeps claim, memberships, and audit in one transaction when an audit write fails", async () => {
    mocks.invitationFindUnique.mockResolvedValue(pendingInvitation);
    mocks.auditCreateMany.mockRejectedValue(new Error("audit write failed"));

    await expect(
      acceptOrganizationInvitation({ token: "a".repeat(43), userId: "expert-1", now }),
    ).rejects.toThrow("audit write failed");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.invitationUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.organizationMemberUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.createNotification).not.toHaveBeenCalled();
    expect(mocks.cancelPendingInvitationEmailJobs).not.toHaveBeenCalled();
  });

  it("revokes only a pending invitation in the trusted organization with audit", async () => {
    mocks.invitationFindFirst.mockResolvedValue(pendingInvitation);
    await revokeOrganizationInvitation({ context, invitationId: "invitation-1", now });
    expect(mocks.invitationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "invitation-1", organizationId: "organization-1" } }),
    );
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REVOKED", revokedAt: now } }),
    );
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.cancelPendingInvitationEmailJobs).toHaveBeenCalledWith(
      expect.anything(),
      "invitation-1",
    );
  });

  it("cannot revoke an invitation from another organization or an accepted invitation", async () => {
    mocks.invitationFindFirst.mockResolvedValue(null);
    await expect(
      revokeOrganizationInvitation({ context, invitationId: "foreign", now }),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
    expect(mocks.invitationUpdateMany).not.toHaveBeenCalled();

    mocks.invitationFindFirst.mockResolvedValue({
      ...pendingInvitation,
      status: "ACCEPTED",
      acceptedAt: now,
    });
    await expect(
      revokeOrganizationInvitation({ context, invitationId: "invitation-1", now }),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
  });

  it("rotates a pending token, invalidates the old hash, refreshes expiry, and audits", async () => {
    mocks.invitationFindFirst.mockResolvedValue({
      ...pendingInvitation,
      tokenHash: "old-hash",
      updatedAt: new Date("2026-07-17T11:00:00.000Z"),
      organization: { name: "Secure Organization" },
      project: null,
    });
    const result = await rotateOrganizationInvitation({
      context,
      invitationId: "invitation-1",
      now,
    });
    const rawToken = result.inviteUrl.replace("/invite/", "");
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tokenHash: "old-hash" }),
        data: {
          tokenHash: hashInvitationToken(rawToken),
          expiresAt: new Date("2026-07-20T12:00:00.000Z"),
        },
      }),
    );
    expect(hashInvitationToken(rawToken)).not.toBe("old-hash");
    expect(mocks.invitationUpdateMany.mock.calls[0][0].data).not.toHaveProperty("token");
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(mocks.createInvitationEmailJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        invitationId: "invitation-1",
        href: result.inviteUrl,
      }),
    );
  });

  it.each([
    { status: "REVOKED", revokedAt: now },
    { status: "ACCEPTED", acceptedAt: now },
    { status: "PENDING", expiresAt: new Date("2026-07-16T12:00:00.000Z") },
  ])("rejects rotation of a non-active invitation ($status)", async (state) => {
    mocks.invitationFindFirst.mockResolvedValue({
      ...pendingInvitation,
      ...state,
      tokenHash: "old-hash",
      updatedAt: new Date("2026-07-17T11:00:00.000Z"),
      organization: { name: "Secure Organization" },
      project: null,
    });
    await expect(
      rotateOrganizationInvitation({ context, invitationId: "invitation-1", now }),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
    expect(mocks.invitationUpdateMany).not.toHaveBeenCalled();
  });
});
