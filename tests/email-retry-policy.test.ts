import { describe, expect, it } from "vitest";

import {
  getEmailRetryDecision,
  RETRY_DELAYS_MS,
} from "@/lib/email/retry-policy";
import { maskEmail, sanitizeEmailError } from "@/lib/email/safety";

describe("email retry policy", () => {
  it("uses 1 minute, 5 minute, 15 minute and 1 hour delays", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");

    for (const [index, delay] of RETRY_DELAYS_MS.entries()) {
      const result = getEmailRetryDecision({
        attempts: index + 1,
        maxAttempts: 5,
        now,
      });
      expect(result.cancelled).toBe(false);
      expect(result.nextAttemptAt?.getTime()).toBe(now.getTime() + delay);
    }
  });

  it("cancels after the maximum number of attempts", () => {
    expect(getEmailRetryDecision({ attempts: 5, maxAttempts: 5 })).toEqual({
      cancelled: true,
      nextAttemptAt: null,
    });
  });
});

describe("email safety helpers", () => {
  it("sanitizes secrets, bearer tokens, email addresses and long errors", () => {
    const result = sanitizeEmailError(
      new Error(`Bearer secret-token re_supersecret user@example.com ${"x".repeat(1200)}`),
    );

    expect(result).not.toContain("secret-token");
    expect(result).not.toContain("re_supersecret");
    expect(result).not.toContain("user@example.com");
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it("masks recipient email addresses", () => {
    expect(maskEmail("andrii@example.com")).toBe("an****@example.com");
    expect(maskEmail("invalid")).toBe("***");
  });
});
