import { beforeEach, describe, expect, it } from "vitest";

import {
  checkInvitationRateLimit,
  resetInvitationRateLimitsForTests,
} from "@/lib/invitation-rate-limit";

describe("invitation process-local rate limits", () => {
  beforeEach(() => resetInvitationRateLimitsForTests());

  it("allows five mutation attempts and blocks the next with a retry hint", () => {
    const now = Date.parse("2026-07-17T12:00:00.000Z");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(checkInvitationRateLimit("accept", "203.0.113.10", now)).toEqual({
        allowed: true,
      });
    }
    expect(checkInvitationRateLimit("accept", "203.0.113.10", now)).toEqual({
      allowed: false,
      retryAfterSeconds: 900,
    });
  });

  it("isolates IP and operation counters", () => {
    const now = Date.parse("2026-07-17T12:00:00.000Z");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      checkInvitationRateLimit("create", "203.0.113.10", now);
    }
    expect(checkInvitationRateLimit("create", "203.0.113.10", now).allowed).toBe(false);
    expect(checkInvitationRateLimit("create", "198.51.100.20", now).allowed).toBe(true);
    expect(checkInvitationRateLimit("resend", "203.0.113.10", now).allowed).toBe(true);
  });

  it("reset clears counters for test isolation", () => {
    const now = Date.parse("2026-07-17T12:00:00.000Z");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      checkInvitationRateLimit("revoke", "203.0.113.10", now);
    }
    expect(checkInvitationRateLimit("revoke", "203.0.113.10", now).allowed).toBe(false);
    resetInvitationRateLimitsForTests();
    expect(checkInvitationRateLimit("revoke", "203.0.113.10", now).allowed).toBe(true);
  });
});
