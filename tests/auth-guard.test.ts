import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import {
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
  requireUser,
} from "@/lib/auth-guard";

describe("runtime application authorization guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: "google-user",
        role: UserRole.DESIGNER,
        onboardingRequired: true,
      },
    });
  });

  it("allows the onboarding action to identify an authenticated partial user", async () => {
    await expect(requireAuthenticatedUser()).resolves.toMatchObject({
      id: "google-user",
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["no membership", UserRole.DESIGNER, []],
    ["stale HEAD role", UserRole.HEAD, [{ role: UserRole.DESIGNER }]],
  ])("rejects ordinary actions for %s", async (_label, role, memberships) => {
    mocks.findUnique.mockResolvedValue({
      isActive: true,
      role,
      organizationMemberships: memberships,
    });

    await expect(requireUser()).rejects.toBeInstanceOf(AuthorizationError);
    await expect(requireRole([role])).rejects.toMatchObject({ status: 403 });
  });

  it("uses the authoritative database role when membership is active", async () => {
    mocks.findUnique.mockResolvedValue({
      isActive: true,
      role: UserRole.HEAD,
      organizationMemberships: [{ role: UserRole.HEAD }],
    });

    await expect(requireRole([UserRole.HEAD])).resolves.toMatchObject({
      role: UserRole.HEAD,
      onboardingRequired: false,
    });
  });
});
