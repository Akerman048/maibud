import { createProcessRateLimiter } from "@/lib/process-rate-limit";

export type InvitationRateLimitOperation =
  | "accept"
  | "create"
  | "inspect"
  | "resend"
  | "revoke";

const mutationLimiter = createProcessRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});
const inspectionLimiter = createProcessRateLimiter({
  limit: 30,
  windowMs: 15 * 60 * 1000,
});

export function checkInvitationRateLimit(
  operation: InvitationRateLimitOperation,
  clientIp: string,
  now = Date.now(),
) {
  const limiter = operation === "inspect" ? inspectionLimiter : mutationLimiter;
  return limiter.check(`${operation}:${clientIp}`, now);
}

export function resetInvitationRateLimitsForTests() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Invitation rate-limit reset is only available in tests");
  }

  mutationLimiter.reset();
  inspectionLimiter.reset();
}
