import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  completeRegistration: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/auth", () => ({ updateSession: mocks.updateSession }));
vi.mock("@/lib/auth-guard", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/process-rate-limit", () => ({
  getTrustedClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/registration-rate-limit", () => ({
  checkRegistrationRateLimit: () => ({ allowed: true }),
}));
vi.mock("@/lib/organization-registration", () => ({
  GoogleOnboardingError: class GoogleOnboardingError extends Error {},
  completeGoogleOrganizationRegistration: mocks.completeRegistration,
}));

import { completeGoogleOnboarding } from "@/app/onboarding/actions";

describe("Google onboarding session refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "google-user" });
    mocks.completeRegistration.mockResolvedValue({
      organizationId: "organization-1",
      created: true,
    });
    mocks.updateSession.mockResolvedValue({});
  });

  it("refreshes the JWT from authoritative data after the transaction", async () => {
    const form = new FormData();
    form.set("organizationName", "Google Organization");
    form.set("termsAccepted", "on");

    await expect(
      completeGoogleOnboarding({ error: "" }, form),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.completeRegistration).toHaveBeenCalledWith({
      userId: "google-user",
      organizationName: "Google Organization",
      invitationToken: undefined,
    });
    expect(mocks.updateSession).toHaveBeenCalledWith({});
    expect(mocks.completeRegistration.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateSession.mock.invocationCallOrder[0],
    );
  });
});
