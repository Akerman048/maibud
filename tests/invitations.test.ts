import { describe, expect, it } from "vitest";

import {
  generateInvitationToken,
  getInvitationExpirationDate,
  hashInvitationToken,
  isInvitationExpired,
  normalizeInvitationEmail,
} from "@/lib/invitations";

describe("invitation tokens", () => {
  it("generates a different cryptographically random token each time", () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("hashes the same token deterministically", () => {
    expect(hashInvitationToken("stable-token")).toBe(
      hashInvitationToken("stable-token"),
    );
  });

  it("never returns the raw token as its stored hash", () => {
    const invitation = generateInvitationToken();

    expect(invitation.token).not.toBe(invitation.tokenHash);
    expect(invitation.tokenHash).toHaveLength(64);
  });
});

describe("invitation normalization and expiration", () => {
  it("normalizes email whitespace and case", () => {
    expect(normalizeInvitationEmail("  Person@Example.COM ")).toBe(
      "person@example.com",
    );
  });

  it("sets expiration exactly 72 hours in the future", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");

    expect(getInvitationExpirationDate(now).toISOString()).toBe(
      "2026-07-18T12:00:00.000Z",
    );
  });

  it("identifies expired and active invitations", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");

    expect(
      isInvitationExpired(
        new Date("2026-07-15T11:59:59.000Z"),
        now,
      ),
    ).toBe(true);
    expect(
      isInvitationExpired(
        new Date("2026-07-15T12:00:01.000Z"),
        now,
      ),
    ).toBe(false);
  });
});
