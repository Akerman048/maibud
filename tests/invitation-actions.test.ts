import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  AuthorizationError: class AuthorizationError extends Error {
    status: 401 | 403;
    constructor(message: string, status: 401 | 403) {
      super(message);
      this.status = status;
    }
  },
  acceptOrganizationInvitation: vi.fn(),
  createOrganizationInvitation: vi.fn(),
  revokeOrganizationInvitation: vi.fn(),
  rotateOrganizationInvitation: vi.fn(),
  requireCurrentHeadOrganization: vi.fn(),
  requireHeadOfOrganization: vi.fn(),
  requireUser: vi.fn(),
  headers: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@/lib/auth-guard", () => ({
  AuthorizationError: mocks.AuthorizationError,
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/organization-access", () => ({
  requireCurrentHeadOrganization: mocks.requireCurrentHeadOrganization,
  requireHeadOfOrganization: mocks.requireHeadOfOrganization,
}));
vi.mock("@/lib/invitation-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/invitation-service")>();
  return {
    ...original,
    acceptOrganizationInvitation: mocks.acceptOrganizationInvitation,
    createOrganizationInvitation: mocks.createOrganizationInvitation,
    revokeOrganizationInvitation: mocks.revokeOrganizationInvitation,
    rotateOrganizationInvitation: mocks.rotateOrganizationInvitation,
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "@/app/dashboard/head/members/actions";
import { acceptInvitation } from "@/app/invite/[token]/actions";
import { resetInvitationRateLimitsForTests } from "@/lib/invitation-rate-limit";

function createForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("email", " Person@Example.COM ");
  form.set("role", "EXPERT");
  form.set("projectId", "project-1");
  form.set("organizationId", "attacker-controlled-organization");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

function mutationForm() {
  const form = new FormData();
  form.set("invitationId", "invitation-1");
  form.set("organizationId", "attacker-controlled-organization");
  return form;
}

describe("invitation server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RENDER", "true");
    resetInvitationRateLimitsForTests();
    mocks.headers.mockResolvedValue(
      new Headers({ "x-forwarded-for": "203.0.113.10" }),
    );
    mocks.requireCurrentHeadOrganization.mockResolvedValue({
      user: { id: "head-1" },
      actorEmail: "head@example.com",
      organization: { id: "trusted-organization", name: "Trusted" },
      membership: { id: "membership-head" },
    });
    mocks.createOrganizationInvitation.mockResolvedValue({
      invitationId: "invitation-1",
      inviteUrl: "/invite/new-token",
      expiresAt: new Date(),
    });
    mocks.rotateOrganizationInvitation.mockResolvedValue({
      inviteUrl: "/invite/rotated-token",
      expiresAt: new Date(),
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects unauthenticated invitation creation", async () => {
    mocks.requireCurrentHeadOrganization.mockRejectedValue(
      new mocks.AuthorizationError("Authentication required", 401),
    );
    await expect(createInvitation({ error: "", success: false }, createForm())).resolves.toEqual({
      error: "Увійдіть у систему, щоб виконати дію.",
      success: false,
    });
    expect(mocks.createOrganizationInvitation).not.toHaveBeenCalled();
  });

  it("rejects a non-HEAD user", async () => {
    mocks.requireCurrentHeadOrganization.mockRejectedValue(
      new mocks.AuthorizationError("HEAD required", 403),
    );
    const result = await createInvitation({ error: "", success: false }, createForm());
    expect(result).toEqual({
      error: "Недостатньо прав у цій організації.",
      success: false,
    });
    expect(mocks.createOrganizationInvitation).not.toHaveBeenCalled();
  });

  it("normalizes input and ignores an attacker-controlled organizationId", async () => {
    const result = await createInvitation({ error: "", success: false }, createForm());
    expect(result).toMatchObject({ success: true, inviteUrl: "/invite/new-token" });
    expect(mocks.createOrganizationInvitation).toHaveBeenCalledWith({
      context: {
        actorId: "head-1",
        actorEmail: "head@example.com",
        organizationId: "trusted-organization",
      },
      email: "person@example.com",
      role: "EXPERT",
      projectId: "project-1",
    });
  });

  it("rate limits creation before authorization or service work", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await createInvitation({ error: "", success: false }, createForm())).success).toBe(true);
    }

    const blocked = await createInvitation({ error: "", success: false }, createForm());
    expect(blocked).toMatchObject({ success: false });
    expect(blocked.error).toContain("Забагато спроб");
    expect(mocks.requireCurrentHeadOrganization).toHaveBeenCalledTimes(5);
    expect(mocks.createOrganizationInvitation).toHaveBeenCalledTimes(5);
  });

  it("isolates rate-limit counters by trusted client IP", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await createInvitation({ error: "", success: false }, createForm());
    }
    mocks.headers.mockResolvedValue(
      new Headers({ "x-forwarded-for": "198.51.100.20" }),
    );
    expect((await createInvitation({ error: "", success: false }, createForm())).success).toBe(true);
    expect(mocks.createOrganizationInvitation).toHaveBeenCalledTimes(6);
  });

  it("derives trusted organization for resend and revoke", async () => {
    await resendInvitation({ error: "", success: false }, mutationForm());
    await revokeInvitation({ error: "", success: false }, mutationForm());
    const trustedContext = expect.objectContaining({
      organizationId: "trusted-organization",
      actorId: "head-1",
    });
    expect(mocks.rotateOrganizationInvitation).toHaveBeenCalledWith({
      context: trustedContext,
      invitationId: "invitation-1",
    });
    expect(mocks.revokeOrganizationInvitation).toHaveBeenCalledWith({
      context: trustedContext,
      invitationId: "invitation-1",
    });
  });

  it.each([
    ["resend", resendInvitation, "rotateOrganizationInvitation"],
    ["revoke", revokeInvitation, "revokeOrganizationInvitation"],
  ] as const)("rejects unauthorized %s", async (_name, action, serviceName) => {
    mocks.requireCurrentHeadOrganization.mockRejectedValue(
      new mocks.AuthorizationError("HEAD required", 403),
    );
    const result = await action({ error: "", success: false }, mutationForm());
    expect(result).toEqual({
      error: "Недостатньо прав у цій організації.",
      success: false,
    });
    expect(mocks[serviceName]).not.toHaveBeenCalled();
  });

  it("requires authentication before acceptance reaches the service", async () => {
    mocks.requireUser.mockRejectedValue(
      new mocks.AuthorizationError("Authentication required", 401),
    );
    const form = new FormData();
    form.set("token", "a".repeat(43));
    await expect(acceptInvitation({ error: "", success: false }, form)).resolves.toEqual({
      error: "Увійдіть у систему та відкрийте запрошення повторно.",
      success: false,
    });
    expect(mocks.acceptOrganizationInvitation).not.toHaveBeenCalled();
  });

  it("rate limits acceptance before authentication and database work", async () => {
    mocks.requireUser.mockResolvedValue({ id: "expert-1" });
    mocks.acceptOrganizationInvitation.mockResolvedValue({ dashboardPath: "/dashboard" });
    mocks.redirect.mockImplementation(() => {
      throw new Error("redirect");
    });
    const form = new FormData();
    form.set("token", "a".repeat(43));

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await expect(acceptInvitation({ error: "", success: false }, form)).rejects.toThrow("redirect");
    }
    const blocked = await acceptInvitation({ error: "", success: false }, form);
    expect(blocked.error).toContain("Забагато спроб");
    expect(mocks.requireUser).toHaveBeenCalledTimes(5);
    expect(mocks.acceptOrganizationInvitation).toHaveBeenCalledTimes(5);
  });

  it("requires a fresh login when acceptance changes the global session role", async () => {
    mocks.requireUser.mockResolvedValue({ id: "designer-1" });
    mocks.acceptOrganizationInvitation.mockResolvedValue({
      dashboardPath: "/dashboard",
      roleChanged: true,
    });
    mocks.signOut.mockImplementation(() => {
      throw new Error("sign-out-redirect");
    });
    const form = new FormData();
    form.set("token", "a".repeat(43));

    await expect(
      acceptInvitation({ error: "", success: false }, form),
    ).rejects.toThrow("sign-out-redirect");
    expect(mocks.signOut).toHaveBeenCalledWith({
      redirectTo: "/login?invitationAccepted=1",
    });
  });
});
