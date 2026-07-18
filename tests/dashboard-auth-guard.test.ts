import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import { requireDashboardRole } from "@/lib/require-dashboard-role";

describe("dashboard membership guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: "google-user",
        role: UserRole.HEAD,
        onboardingRequired: false,
      },
    });
  });

  it("redirects a user with no active membership to onboarding", async () => {
    mocks.findUnique.mockResolvedValue({
      isActive: true,
      role: UserRole.HEAD,
      organizationMemberships: [],
    });

    await expect(requireDashboardRole(UserRole.HEAD)).rejects.toThrow(
      "REDIRECT:/onboarding",
    );
  });

  it("rejects stale HEAD authorization without an active HEAD membership", async () => {
    mocks.findUnique.mockResolvedValue({
      isActive: true,
      role: UserRole.HEAD,
      organizationMemberships: [{ role: UserRole.DESIGNER }],
    });

    await expect(requireDashboardRole(UserRole.HEAD)).rejects.toThrow(
      "REDIRECT:/project/inactive",
    );
  });

  it("returns the user only with an active matching membership", async () => {
    mocks.findUnique.mockResolvedValue({
      isActive: true,
      role: UserRole.HEAD,
      organizationMemberships: [{ role: UserRole.HEAD }],
    });

    await expect(requireDashboardRole(UserRole.HEAD)).resolves.toMatchObject({
      id: "google-user",
      role: UserRole.HEAD,
    });
  });
});
