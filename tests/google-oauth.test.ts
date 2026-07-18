import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma, UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  userCreate: vi.fn(),
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userDeleteMany: vi.fn(),
  accountCreate: vi.fn(),
  accountFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: mocks.userCreate,
      findFirst: mocks.userFindFirst,
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      deleteMany: mocks.userDeleteMany,
    },
    account: {
      create: mocks.accountCreate,
      findUnique: mocks.accountFindUnique,
    },
  },
}));

import {
  createAuthAdapter,
  createGoogleProvider,
  getGoogleOAuthCredentials,
  inspectGoogleSignIn,
  GoogleAccountLinkingNotSupportedError,
  InvalidGoogleProfileError,
  parseGoogleProfile,
} from "@/lib/google-oauth";

const validProfile = {
  sub: "google-user-1",
  email: " Person@Example.COM ",
  email_verified: true,
  name: "Person Example",
  picture: "https://example.com/avatar.png",
  role: "HEAD",
  access_token: "must-be-ignored",
};

function uniqueConstraintError(target: unknown) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: { target },
  });
}

describe("Google OAuth profile and provider", () => {
  it("accepts only a verified normalized email and ignores unsupported data", () => {
    expect(parseGoogleProfile(validProfile)).toEqual({
      id: "google-user-1",
      email: "person@example.com",
      name: "Person Example",
      image: null,
      role: UserRole.DESIGNER,
    });
  });

  it.each([
    [null, "person@example.com"],
    ["", "person@example.com"],
    ["   ", "person@example.com"],
    ["  Person    Example  ", "Person Example"],
    ["x".repeat(500), "x".repeat(200)],
  ])("normalizes Google name %j safely", (name, expected) => {
    expect(parseGoogleProfile({ ...validProfile, name }).name).toBe(expected);
  });

  it.each([
    [{ ...validProfile, email: undefined }],
    [{ ...validProfile, email: "not-an-email" }],
    [{ ...validProfile, email: `${"a".repeat(250)}@x.com` }],
    [{ ...validProfile, email_verified: false }],
    [{ ...validProfile, email_verified: undefined }],
  ])("rejects an unusable or unverified email", (profile) => {
    expect(() => parseGoogleProfile(profile)).toThrow(InvalidGoogleProfileError);
  });

  it("enables Google only when both server credentials exist", () => {
    expect(getGoogleOAuthCredentials({})).toBeNull();
    expect(() =>
      getGoogleOAuthCredentials({ AUTH_GOOGLE_ID: "id-only" }),
    ).toThrow(/requires both/);
    expect(
      getGoogleOAuthCredentials({
        AUTH_GOOGLE_ID: " id ",
        AUTH_GOOGLE_SECRET: " secret ",
      }),
    ).toEqual({ clientId: "id", clientSecret: "secret" });
  });

  it("requests minimal scopes and enables verified-email linking only on Google", () => {
    const provider = createGoogleProvider({
      AUTH_GOOGLE_ID: "id",
      AUTH_GOOGLE_SECRET: "secret",
    });
    const options = provider?.options as {
      authorization?: { params?: Record<string, string> };
      allowDangerousEmailAccountLinking?: boolean;
    };

    expect(options.authorization?.params).toEqual({
      scope: "openid email profile",
    });
    expect(options.authorization?.params).not.toHaveProperty("access_type");
    expect(options.authorization?.params).not.toHaveProperty("prompt");
    expect(options.allowDangerousEmailAccountLinking).toBe(true);
  });
});

describe("Google OAuth adapter safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userCreate.mockResolvedValue({ id: "user-1" });
    mocks.accountCreate.mockResolvedValue({
      id: "account-1",
      userId: "user-1",
      type: "oidc",
      provider: "google",
      providerAccountId: "google-user-1",
    });
    mocks.userFindUnique.mockResolvedValue({
      isActive: true,
      passwordHash: null,
      createdAt: new Date(),
      accounts: [],
      organizationMemberships: [],
    });
    mocks.userDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("creates a minimal user with a trusted initial role", async () => {
    const adapter = createAuthAdapter();
    await adapter.createUser?.({
      id: "provider-controlled-id",
      name: " Person ",
      email: "PERSON@EXAMPLE.COM",
      emailVerified: null,
      image: "https://example.com/untrusted.png",
      role: UserRole.HEAD,
    });

    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        name: "Person",
        email: "person@example.com",
        emailVerified: expect.any(Date),
        role: UserRole.DESIGNER,
      },
    });
  });

  it("persists only provider identity and never provider tokens", async () => {
    const adapter = createAuthAdapter();
    await adapter.linkAccount?.({
      userId: "user-1",
      type: "oidc",
      provider: "google",
      providerAccountId: "google-user-1",
      access_token: "access-secret",
      id_token: "id-secret",
      refresh_token: "refresh-secret",
      expires_at: 1_900_000_000,
      token_type: "bearer",
      scope: "openid email profile",
      session_state: "session-secret",
    });

    expect(mocks.accountCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      },
    });
    expect(mocks.accountCreate.mock.calls[0][0].data).not.toHaveProperty(
      "access_token",
    );
    expect(mocks.accountCreate.mock.calls[0][0].data).not.toHaveProperty(
      "id_token",
    );
    expect(mocks.accountCreate.mock.calls[0][0].data).not.toHaveProperty(
      "refresh_token",
    );
  });

  it("links an active credentials user without changing application data", async () => {
    const existingUser = {
      isActive: true,
      passwordHash: "credentials-password",
      role: UserRole.HEAD,
      notificationPreferences: { emailNotificationsEnabled: false },
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      accounts: [],
      organizationMemberships: [{ id: "membership-1" }],
      projectMemberships: [{ id: "project-membership-1" }],
    };
    mocks.userFindUnique.mockResolvedValue(existingUser);
    mocks.accountCreate.mockResolvedValue({
      id: "account-1",
      userId: "credentials-user",
      type: "oidc",
      provider: "google",
      providerAccountId: "google-user-1",
    });

    await expect(
      createAuthAdapter().linkAccount?.({
        userId: "credentials-user",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
        access_token: "must-not-persist",
        refresh_token: "must-not-persist",
        id_token: "must-not-persist",
      }),
    ).resolves.toMatchObject({ userId: "credentials-user" });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(existingUser).toMatchObject({
      passwordHash: "credentials-password",
      role: UserRole.HEAD,
      organizationMemberships: [{ id: "membership-1" }],
      projectMemberships: [{ id: "project-membership-1" }],
      notificationPreferences: { emailNotificationsEnabled: false },
    });
    expect(mocks.accountCreate).toHaveBeenCalledTimes(1);
    expect(mocks.accountCreate).toHaveBeenCalledWith({
      data: {
        userId: "credentials-user",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      },
    });
  });

  it("rejects linking to an inactive user", async () => {
    mocks.userFindUnique.mockResolvedValue({
      isActive: false,
      passwordHash: "credentials-password",
      createdAt: new Date(),
      accounts: [],
      organizationMemberships: [{ id: "membership-1" }],
    });

    await expect(
      createAuthAdapter().linkAccount?.({
        userId: "inactive-user",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      }),
    ).rejects.toBeInstanceOf(GoogleAccountLinkingNotSupportedError);
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("treats only the same provider identity/user race as idempotent", async () => {
    mocks.accountCreate.mockRejectedValue(
      uniqueConstraintError(["provider", "providerAccountId"]),
    );
    mocks.accountFindUnique.mockResolvedValue({
      userId: "user-1",
      provider: "google",
      providerAccountId: "google-user-1",
      type: "oidc",
    });

    const adapter = createAuthAdapter();
    await expect(
      adapter.linkAccount?.({
        userId: "user-1",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      }),
    ).resolves.toMatchObject({ userId: "user-1" });

    mocks.accountFindUnique.mockResolvedValue({ userId: "other-user" });
    await expect(
      adapter.linkAccount?.({
        userId: "user-1",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(mocks.userDeleteMany).toHaveBeenCalledTimes(1);
  });

  it("does not reinterpret an unrelated P2002 as an account race", async () => {
    const error = uniqueConstraintError(["email"]);
    mocks.accountCreate.mockRejectedValue(error);

    await expect(
      createAuthAdapter().linkAccount?.({
        userId: "user-1",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      }),
    ).rejects.toBe(error);
    expect(mocks.accountFindUnique).not.toHaveBeenCalled();
  });

  it("allows a matching active credentials user and denies an inactive user", async () => {
    mocks.accountFindUnique.mockResolvedValueOnce(null);
    mocks.userFindFirst.mockResolvedValueOnce({
      id: "credentials-user",
      isActive: true,
    });
    await expect(
      inspectGoogleSignIn(validProfile, "new-google-id"),
    ).resolves.toBe(true);

    mocks.accountFindUnique.mockResolvedValueOnce(null);
    mocks.userFindFirst.mockResolvedValueOnce({
      id: "inactive-user",
      isActive: false,
    });
    await expect(
      inspectGoogleSignIn(validProfile, "new-google-id"),
    ).resolves.toBe(false);
  });

  it("reuses an existing linked account on subsequent Google login", async () => {
    mocks.accountFindUnique.mockResolvedValueOnce({
      user: { id: "credentials-user", isActive: true },
    });
    await expect(
      inspectGoogleSignIn(validProfile, "google-user-1"),
    ).resolves.toBe(true);
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("does not link a different Google email to an authenticated user", async () => {
    mocks.accountFindUnique.mockResolvedValueOnce(null);
    mocks.userFindFirst.mockResolvedValueOnce(null);
    await expect(
      inspectGoogleSignIn(
        { ...validProfile, email: "different@example.com" },
        "new-google-id",
        "credentials-user",
      ),
    ).resolves.toBe(false);
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("treats an unowned different email as a new Google user, not a link", async () => {
    mocks.accountFindUnique.mockResolvedValueOnce(null);
    mocks.userFindFirst.mockResolvedValueOnce(null);

    await expect(
      inspectGoogleSignIn(
        { ...validProfile, email: "new-person@example.com" },
        "new-google-id",
      ),
    ).resolves.toBe(true);
    expect(mocks.userFindFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: "new-person@example.com", mode: "insensitive" },
      },
      select: { id: true, isActive: true },
    });
    expect(mocks.accountCreate).not.toHaveBeenCalled();
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("makes concurrent first links idempotent for the same user", async () => {
    mocks.userFindUnique.mockResolvedValue({
      isActive: true,
      passwordHash: "credentials-password",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      accounts: [],
      organizationMemberships: [{ id: "membership-1" }],
    });
    mocks.accountCreate
      .mockResolvedValueOnce({
        id: "account-1",
        userId: "credentials-user",
        type: "oidc",
        provider: "google",
        providerAccountId: "google-user-1",
      })
      .mockRejectedValueOnce(
        uniqueConstraintError(["provider", "providerAccountId"]),
      );
    mocks.accountFindUnique.mockResolvedValue({
      id: "account-1",
      userId: "credentials-user",
      type: "oidc",
      provider: "google",
      providerAccountId: "google-user-1",
    });
    const adapter = createAuthAdapter();
    const payload = {
      userId: "credentials-user",
      type: "oidc" as const,
      provider: "google",
      providerAccountId: "google-user-1",
    };

    await expect(
      Promise.all([adapter.linkAccount?.(payload), adapter.linkAccount?.(payload)]),
    ).resolves.toEqual([
      expect.objectContaining({ id: "account-1" }),
      expect.objectContaining({ id: "account-1" }),
    ]);
    expect(mocks.accountCreate).toHaveBeenCalledTimes(2);
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userDeleteMany).not.toHaveBeenCalled();
  });
});
