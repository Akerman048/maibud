const REGISTRATION_RATE_LIMIT = 5;
const REGISTRATION_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_PROCESS_LOCAL_ENTRIES = 10_000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const entries = new Map<string, RateLimitEntry>();

function firstForwardedAddress(value: string | null) {
  return value
    ?.split(",", 1)[0]
    ?.trim();
}

export function getRegistrationClientIp(request: Request) {
  // Render and Vercel are the trusted reverse proxies supported by this project.
  // Never accept a caller-supplied forwarding header outside those deployments.
  if (process.env.VERCEL) {
    return request.headers.get("x-vercel-forwarded-for")?.trim() || "unknown";
  }

  if (process.env.RENDER) {
    return (
      firstForwardedAddress(request.headers.get("x-forwarded-for")) ||
      "unknown"
    );
  }

  return "unknown";
}

export function checkRegistrationRateLimit(
  clientIp: string,
  now = Date.now(),
) {
  const current = entries.get(clientIp);

  if (!current || current.resetAt <= now) {
    if (!current && entries.size >= MAX_PROCESS_LOCAL_ENTRIES) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey !== undefined) entries.delete(oldestKey);
    }

    entries.set(clientIp, {
      count: 1,
      resetAt: now + REGISTRATION_RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true as const };
  }

  if (current.count >= REGISTRATION_RATE_LIMIT) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true as const };
}

export function resetRegistrationRateLimitForTests() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Registration rate-limit reset is only available in tests");
  }

  entries.clear();
}
