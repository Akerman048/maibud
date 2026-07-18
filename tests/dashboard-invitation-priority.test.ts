import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cookieGet: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));

import DashboardPage from "@/app/dashboard/page";

describe("dashboard invitation routing priority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { role: "DESIGNER", onboardingRequired: true },
    });
  });

  it("returns a new Google user to invitation completion before onboarding", async () => {
    const intent = `/invite/${"a".repeat(43)}`;
    mocks.cookieGet.mockReturnValue({ value: intent });

    await expect(DashboardPage()).rejects.toThrow(`REDIRECT:${intent}`);
    expect(mocks.redirect).not.toHaveBeenCalledWith("/onboarding");
  });

  it("uses ordinary onboarding when no valid invitation intent exists", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/onboarding");
  });
});
