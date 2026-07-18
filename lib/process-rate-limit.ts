type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type HeaderReader = Pick<Headers, "get">;

export function getTrustedClientIp(headers: HeaderReader) {
  if (process.env.VERCEL) {
    return headers.get("x-vercel-forwarded-for")?.trim() || "unknown";
  }

  if (process.env.RENDER) {
    return headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown";
  }

  return "unknown";
}

export function createProcessRateLimiter({
  limit,
  windowMs,
  maxEntries = 10_000,
}: {
  limit: number;
  windowMs: number;
  maxEntries?: number;
}) {
  const entries = new Map<string, RateLimitEntry>();

  return {
    check(key: string, now = Date.now()) {
      const current = entries.get(key);

      if (!current || current.resetAt <= now) {
        if (!current && entries.size >= maxEntries) {
          const oldestKey = entries.keys().next().value;
          if (oldestKey !== undefined) entries.delete(oldestKey);
        }

        entries.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true as const };
      }

      if (current.count >= limit) {
        return {
          allowed: false as const,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((current.resetAt - now) / 1000),
          ),
        };
      }

      current.count += 1;
      return { allowed: true as const };
    },
    reset() {
      entries.clear();
    },
  };
}
