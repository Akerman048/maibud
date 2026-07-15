const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000] as const;

export function getEmailRetryDecision({
  attempts,
  maxAttempts,
  now = new Date(),
}: {
  attempts: number;
  maxAttempts: number;
  now?: Date;
}) {
  if (attempts >= maxAttempts) {
    return { cancelled: true, nextAttemptAt: null } as const;
  }

  const delayIndex = Math.min(
    Math.max(attempts - 1, 0),
    RETRY_DELAYS_MS.length - 1,
  );

  return {
    cancelled: false,
    nextAttemptAt: new Date(now.getTime() + RETRY_DELAYS_MS[delayIndex]),
  } as const;
}

export { RETRY_DELAYS_MS };
