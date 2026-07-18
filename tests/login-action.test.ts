import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "CredentialsSignin";
  },
}));
vi.mock("@/auth", () => ({ signIn: mocks.signIn }));

import { login } from "@/app/login/actions";

function loginForm(callbackUrl: string) {
  const form = new FormData();
  form.set("email", " Person@Example.COM ");
  form.set("password", "Secure123");
  form.set("callbackUrl", callbackUrl);
  return form;
}

describe("login invitation return path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves a validated relative invitation callback", async () => {
    const callbackUrl = `/invite/${"a".repeat(43)}`;

    await expect(login({ error: "" }, loginForm(callbackUrl))).resolves.toEqual({
      error: "",
    });
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "person@example.com",
      password: "Secure123",
      redirectTo: callbackUrl,
    });
  });

  it("replaces absolute or unrelated callbacks with the dashboard", async () => {
    await login({ error: "" }, loginForm("https://evil.example/invite/token"));

    expect(mocks.signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/dashboard" }),
    );
  });
});
