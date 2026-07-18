export type NormalizedError = {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  stack?: string;
};

function safeString(value: unknown, fallback: string, maximum = 500) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(
      /([?&](?:X-Amz-[^=]+|token|secret|signature|code|state|id_token|access_token|refresh_token)=)[^&\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\b[^\s/\\]+\.(?:pdf|docx?|xlsx?|dwg|png|jpe?g)\b/gi, "[REDACTED_FILENAME]")
    .slice(0, maximum);
}

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? record[key] : undefined;
}

export function normalizeErrorForLogging(
  error: unknown,
  environment = process.env.NODE_ENV,
): NormalizedError {
  if (!(error instanceof Error) && (typeof error !== "object" || error === null)) {
    return { name: "UnknownError", message: "Unknown error" };
  }

  const record = error as Record<string, unknown>;
  const originalName = error instanceof Error ? error.name : readString(record, "name");
  const originalMessage = error instanceof Error ? error.message : readString(record, "message");
  const code = readString(record, "code");
  const metadata =
    typeof record.$metadata === "object" && record.$metadata !== null
      ? (record.$metadata as Record<string, unknown>)
      : undefined;

  const isPrisma =
    originalName?.startsWith("PrismaClient") ||
    (typeof code === "string" && /^P\d{4}$/.test(code));
  const isAws = Boolean(metadata) || originalName?.endsWith("ServiceException");
  const isResend = originalName?.toLowerCase().includes("resend");

  const normalized: NormalizedError = {
    name: isPrisma
      ? "PrismaError"
      : isAws
        ? "AwsServiceError"
        : isResend
          ? "ResendError"
          : safeString(originalName, "Error"),
    message: isPrisma
      ? "Database operation failed"
      : safeString(originalMessage, "Unexpected error"),
  };

  if (code && code.length <= 64) normalized.code = code;
  if (metadata) {
    if (typeof metadata.httpStatusCode === "number") {
      normalized.statusCode = metadata.httpStatusCode;
    }
    if (typeof metadata.requestId === "string") {
      normalized.requestId = metadata.requestId.slice(0, 128);
    }
  }
  if (environment !== "production" && error instanceof Error && error.stack) {
    normalized.stack = safeString(error.stack, "Error", 2_000);
  }
  return normalized;
}

export const normalizeError = normalizeErrorForLogging;
