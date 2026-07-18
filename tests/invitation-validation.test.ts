import { describe, expect, it } from "vitest";

import {
  getInvitationCallbackPath,
  getSafeInvitationCallbackPath,
  invitationEmailSchema,
  invitationRoleSchema,
  invitationTokenSchema,
} from "@/lib/invitation-validation";

describe("invitation validation", () => {
  it("trims and lowercases a valid email", () => {
    expect(invitationEmailSchema.parse(" Person@Example.COM ")).toBe(
      "person@example.com",
    );
  });

  it("rejects malformed and overlong emails", () => {
    expect(invitationEmailSchema.safeParse("not-an-email").success).toBe(false);
    expect(
      invitationEmailSchema.safeParse(
        `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`,
      ).success,
    ).toBe(false);
  });

  it.each(["HEAD", "CLIENT", "UNKNOWN"])("rejects unsupported role %s", (role) => {
    expect(invitationRoleSchema.safeParse(role).success).toBe(false);
  });

  it.each(["EXPERT", "DESIGNER", "ARCHIVIST"])("accepts supported role %s", (role) => {
    expect(invitationRoleSchema.safeParse(role).success).toBe(true);
  });

  it("rejects missing, malformed, and oversized tokens", () => {
    expect(invitationTokenSchema.safeParse("").success).toBe(false);
    expect(invitationTokenSchema.safeParse("short").success).toBe(false);
    expect(invitationTokenSchema.safeParse("!".repeat(43)).success).toBe(false);
    expect(invitationTokenSchema.safeParse("a".repeat(129)).success).toBe(false);
    expect(invitationTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
  });

  it("accepts only a safe relative invitation return path", () => {
    const token = "a".repeat(43);
    const path = getInvitationCallbackPath(token);

    expect(path).toBe(`/invite/${token}`);
    expect(getSafeInvitationCallbackPath(path)).toBe(path);
    expect(getSafeInvitationCallbackPath("https://evil.example/invite/token")).toBe(
      "/dashboard",
    );
    expect(getSafeInvitationCallbackPath("//evil.example/invite/token")).toBe(
      "/dashboard",
    );
    expect(getSafeInvitationCallbackPath("/dashboard/head")).toBe("/dashboard");
  });
});
