import { createHash, randomBytes } from "node:crypto";

const INVITATION_TTL_HOURS = 72;

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInvitationToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashInvitationToken(token),
  };
}

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getInvitationExpirationDate(now = new Date()) {
  return new Date(
    now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000,
  );
}

export function isInvitationExpired(
  expiresAt: Date,
  now = new Date(),
) {
  return expiresAt.getTime() <= now.getTime();
}
