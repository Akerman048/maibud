import { describe, expect, it } from "vitest";

import {
  getInvitationIntentToken,
  parseInvitationIntentPath,
} from "@/lib/invitation-intent";

describe("Google invitation intent", () => {
  const token = "a".repeat(43);
  const path = `/invite/${token}`;

  it("round-trips only the exact validated local invitation path", () => {
    expect(parseInvitationIntentPath(path)).toBe(path);
    expect(getInvitationIntentToken(path)).toBe(token);
  });

  it.each([
    "https://evil.example/invite/token",
    "//evil.example/invite/token",
    "%2F%2Fevil.example/invite/token",
    `/invite/${"a".repeat(32)}\\evil`,
    `/invite/${"a".repeat(32)}\u0000evil`,
    "/invite/../../onboarding",
    "/onboarding",
  ])("rejects unsafe intent %j", (value) => {
    expect(parseInvitationIntentPath(value)).toBeNull();
    expect(getInvitationIntentToken(value)).toBeNull();
  });
});
