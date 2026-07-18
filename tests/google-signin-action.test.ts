import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSet, delete: mocks.cookieDelete }),
}));
vi.mock("@/lib/google-oauth", () => ({
  getGoogleOAuthCredentials: () => ({
    clientId: "configured",
    clientSecret: "configured",
  }),
}));

import { googleSignIn } from "@/app/login/google-actions";

function googleForm(callbackUrl: string) {
  const form = new FormData();
  form.set("callbackUrl", callbackUrl);
  return form;
}

describe("Google sign-in callback preservation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["/dashboard", "/dashboard"],
    [`/invite/${"a".repeat(43)}`, `/invite/${"a".repeat(43)}`],
    ["https://evil.example/callback", "/dashboard"],
    ["//evil.example/invite/token", "/dashboard"],
    ["%2F%2Fevil.example/invite/token", "/dashboard"],
    [`/invite/${"a".repeat(32)}\\evil`, "/dashboard"],
    [`/invite/${"a".repeat(32)}\u0000evil`, "/dashboard"],
  ])("passes callback %j as safe redirect %j", async (callback, expected) => {
    await expect(
      googleSignIn({ error: "" }, googleForm(callback)),
    ).resolves.toEqual({ error: "" });
    expect(mocks.signIn).toHaveBeenCalledWith("google", {
      redirectTo: expected,
    });
    if (expected.startsWith("/invite/")) {
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "maibud_invitation_intent",
        expected,
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
      );
      expect(mocks.cookieDelete).not.toHaveBeenCalled();
    } else {
      expect(mocks.cookieDelete).toHaveBeenCalledWith(
        "maibud_invitation_intent",
      );
      expect(mocks.cookieSet).not.toHaveBeenCalled();
    }
  });
});
