import {
  createProcessRateLimiter,
  getTrustedClientIp,
} from "@/lib/process-rate-limit";

const limiter = createProcessRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});

export function getRegistrationClientIp(request: Request) {
  return getTrustedClientIp(request.headers);
}

export function checkRegistrationRateLimit(
  clientIp: string,
  now = Date.now(),
) {
  return limiter.check(clientIp, now);
}

export function resetRegistrationRateLimitForTests() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Registration rate-limit reset is only available in tests");
  }

  limiter.reset();
}
