const MAX_ERROR_LENGTH = 1000;

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function maskEmail(value: string) {
  const [localPart, domain] = value.split("@");

  if (!localPart || !domain) {
    return "***";
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}

export function sanitizeEmailError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Email provider request failed";
  const sanitized = raw
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/re_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/[\r\n\t]+/g, " ")
    .trim();

  return (sanitized || "Email provider request failed").slice(0, MAX_ERROR_LENGTH);
}
