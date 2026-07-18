import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  config: undefined as unknown as Record<string, unknown>,
  findUnique: vi.fn(),
  inspectGoogleSignIn: vi.fn(),
  logDebug: vi.fn(),
  logError: vi.fn(),
  authSession: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    mocks.config = config;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: mocks.authSession,
      signIn: vi.fn(),
      signOut: vi.fn(),
      unstable_update: vi.fn(),
    };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (options: unknown) => ({ id: "credentials", options }),
}));
vi.mock("@/lib/google-oauth", () => ({
  createAuthAdapter: () => ({ name: "adapter" }),
  createGoogleProvider: () => ({ id: "google" }),
  inspectGoogleSignIn: mocks.inspectGoogleSignIn,
}));
vi.mock("@/lib/password", () => ({ verifyPassword: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: mocks.logDebug,
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.logError,
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

await import("@/auth");

const validGoogleProfile = {
  sub: "google-user-1",
  email: "person@example.com",
  email_verified: true,
};

type AuthCallbacks = {
  signIn(input: Record<string, unknown>): Promise<boolean>;
  redirect(input: { url: string; baseUrl: string }): string;
  jwt(input: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  session(input: Record<string, unknown>): Promise<Record<string, unknown>>;
};

describe("Auth.js Google JWT/session integration", () => {
  const callbacks = mocks.config.callbacks as AuthCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({
      role: UserRole.EXPERT,
      isActive: true,
      organizationMemberships: [{ id: "membership-1" }],
    });
    mocks.authSession.mockResolvedValue(null);
  });

  it("passes the authenticated user id to the Google linking gate", async () => {
    mocks.authSession.mockResolvedValue({ user: { id: "credentials-user" } });
    mocks.inspectGoogleSignIn.mockResolvedValue(true);

    await expect(
      callbacks.signIn({
        account: {
          provider: "google",
          providerAccountId: "google-user-1",
        },
        profile: validGoogleProfile,
      }),
    ).resolves.toBe(true);
    expect(mocks.inspectGoogleSignIn).toHaveBeenCalledWith(
      validGoogleProfile,
      "google-user-1",
      "credentials-user",
    );
  });

  it("allows verified Google authentication before invitation acceptance", async () => {
    mocks.inspectGoogleSignIn.mockResolvedValue(true);

    await expect(
      callbacks.signIn({
        account: {
          provider: "google",
          providerAccountId: "new-google-user",
        },
        profile: validGoogleProfile,
      }),
    ).resolves.toBe(true);
    expect(mocks.inspectGoogleSignIn).toHaveBeenCalledWith(
      validGoogleProfile,
      "new-google-user",
      undefined,
    );
  });

  it("preserves a local invitation callback and rejects an external callback", () => {
    const token = "a".repeat(43);
    const baseUrl = "https://maibud.example";

    expect(
      callbacks.redirect({ url: `/invite/${token}`, baseUrl }),
    ).toBe(`${baseUrl}/invite/${token}`);
    expect(
      callbacks.redirect({
        url: "https://evil.example/invite/stolen-token",
        baseUrl,
      }),
    ).toBe(baseUrl);
  });

  it("keeps JWT sessions and both credentials and Google providers", () => {
    expect(mocks.config.session).toEqual({ strategy: "jwt" });
    expect(mocks.config.providers).toEqual([
      expect.objectContaining({ id: "credentials" }),
      expect.objectContaining({ id: "google" }),
    ]);
  });

  it("logs only the adapter operation name for development diagnostics", () => {
    const authLogger = mocks.config.logger as {
      debug(message: string, metadata?: unknown): void;
    };

    authLogger.debug("adapter_getUserByAccount", {
      args: [{ access_token: "must-not-be-logged" }],
    });

    expect(mocks.logDebug).toHaveBeenCalledWith("Auth.js adapter operation", {
      adapterOperation: "getUserByAccount",
    });
    expect(JSON.stringify(mocks.logDebug.mock.calls)).not.toContain(
      "must-not-be-logged",
    );
  });

  it("logs stable Auth.js types and sanitized nested adapter causes", () => {
    const authLogger = mocks.config.logger as {
      error(error: unknown): void;
    };
    const nestedError = new Error(
      "relation Account does not exist for person@example.com; " +
        "DATABASE_URL=postgresql://admin:password@database/internal " +
        "access_token=google-secret",
    );
    authLogger.error({
      type: "AdapterError",
      name: "f",
      message: "Adapter failed with state=oauth-state",
      cause: { err: nestedError },
      details: {
        provider: "google",
        method: "getUserByAccount",
        code: "oauth-code",
        invitationToken: "raw-invitation-token",
      },
    });

    expect(mocks.logError).toHaveBeenCalledWith(
      "Auth.js authentication error",
      expect.objectContaining({
        errorType: "AdapterError",
        errorName: "f",
        errorMessage: "Adapter failed with state=[REDACTED]",
        causeErrorName: "Error",
        causeErrorMessage: expect.stringContaining("relation Account does not exist"),
        provider: "google",
        details: {
          provider: "google",
          method: "getUserByAccount",
          code: "[REDACTED]",
          invitationToken: "[REDACTED]",
        },
      }),
    );
    const output = JSON.stringify(mocks.logError.mock.calls);
    expect(output).not.toContain("person@example.com");
    expect(output).not.toContain("admin:password");
    expect(output).not.toContain("google-secret");
    expect(output).not.toContain("oauth-state");
    expect(output).not.toContain("oauth-code");
    expect(output).not.toContain("raw-invitation-token");
  });

  it("hydrates role and onboarding only from trusted application data", async () => {
    const token = await callbacks.jwt({
      token: {
        sub: "user-1",
        access_token: undefined,
        id_token: undefined,
      },
      user: { id: "user-1", role: UserRole.HEAD },
      trigger: "signIn",
    });

    expect(token).toMatchObject({
      userId: "user-1",
      role: UserRole.EXPERT,
      onboardingRequired: false,
    });
    expect(token).not.toHaveProperty("accessToken");
    expect(token).not.toHaveProperty("idToken");

    const session = await callbacks.session({
      session: { user: { email: "person@example.com" } },
      token,
    });
    expect(session.user).toEqual({
      email: "person@example.com",
      id: "user-1",
      role: UserRole.EXPERT,
      onboardingRequired: false,
    });
    expect(session.user).not.toHaveProperty("accessToken");
    expect(session.user).not.toHaveProperty("idToken");
  });

  it("marks a new Google user for onboarding and rejects inactive users", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      role: UserRole.DESIGNER,
      isActive: true,
      organizationMemberships: [],
    });
    await expect(
      callbacks.jwt({
        token: {},
        user: { id: "new-google-user", role: UserRole.DESIGNER },
        trigger: "signUp",
      }),
    ).resolves.toMatchObject({ onboardingRequired: true });

    mocks.findUnique.mockResolvedValueOnce({
      role: UserRole.DESIGNER,
      isActive: false,
      organizationMemberships: [],
    });
    await expect(
      callbacks.jwt({
        token: {},
        user: { id: "inactive-user", role: UserRole.DESIGNER },
        trigger: "signIn",
      }),
    ).resolves.toBeNull();
  });

  it("reloads HEAD after onboarding and ignores a client-supplied update role", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({
        role: UserRole.DESIGNER,
        isActive: true,
        organizationMemberships: [],
      })
      .mockResolvedValueOnce({
        role: UserRole.HEAD,
        isActive: true,
        organizationMemberships: [{ id: "head-membership" }],
      });

    const before = await callbacks.jwt({
      token: {},
      user: { id: "google-user", role: UserRole.DESIGNER },
      trigger: "signUp",
    });
    expect(before).toMatchObject({
      role: UserRole.DESIGNER,
      onboardingRequired: true,
    });

    const after = await callbacks.jwt({
      token: before,
      trigger: "update",
      session: { user: { role: UserRole.CLIENT } },
    });
    expect(after).toMatchObject({
      role: UserRole.HEAD,
      onboardingRequired: false,
    });
    expect(mocks.findUnique).toHaveBeenLastCalledWith({
      where: { id: "google-user" },
      select: expect.objectContaining({ role: true, isActive: true }),
    });
  });
});
