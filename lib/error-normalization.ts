export type NormalizedError = {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  stack?: string;
};

export type NormalizedAuthError = {
  errorType?: string;
  errorName?: string;
  errorMessage?: string;
  causeName?: string;
  causeMessage?: string;
  causeErrorName?: string;
  causeErrorMessage?: string;
  details?: unknown;
  provider?: string;
};

const AUTH_DETAIL_MAX_DEPTH = 4;
const AUTH_DETAIL_MAX_KEYS = 30;
const AUTH_DETAIL_MAX_ITEMS = 15;
const SENSITIVE_AUTH_DETAIL_KEY =
  /(?:authorization|cookie|password|passwd|secret|token|signature|code|state|email|database.?url|connection.?string|filename|access_token|refresh_token|id_token)/i;

function safeString(value: unknown, fallback: string, maximum = 500) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b(access_token|refresh_token|id_token|code|state|signature|invitation(?:_|-)?token)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,&}]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(
      /([?&](?:X-Amz-[^=]+|token|secret|signature|code|state|id_token|access_token|refresh_token)=)[^&\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(/\/invite\/[A-Za-z0-9_-]{16,}/gi, "/invite/[REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\b[^\s/\\]+\.(?:pdf|docx?|xlsx?|dwg|png|jpe?g)\b/gi, "[REDACTED_FILENAME]")
    .slice(0, maximum);
}

function optionalSafeString(value: unknown, maximum = 500) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return safeString(value, "", maximum);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function isSafelyStructured(value: unknown) {
  if (Array.isArray(value)) return true;
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeAuthDetails(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") return safeString(value, "", 300);
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "object") return `[${typeof value}]`;
  if (depth >= AUTH_DETAIL_MAX_DEPTH) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, AUTH_DETAIL_MAX_ITEMS)
      .map((item) => sanitizeAuthDetails(item, depth + 1, seen));
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return "[UNSUPPORTED_OBJECT]";
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, AUTH_DETAIL_MAX_KEYS)) {
    if (SENSITIVE_AUTH_DETAIL_KEY.test(key)) {
      output[key] = "[REDACTED]";
      continue;
    }
    const sanitized = sanitizeAuthDetails(item, depth + 1, seen);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

function readProvider(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && /^[a-z0-9._-]{1,64}$/i.test(value)) {
      return value;
    }
  }
  return undefined;
}

export function normalizeAuthErrorForLogging(error: unknown): NormalizedAuthError {
  try {
    const record = asRecord(error);
    if (!record) {
      return { errorName: "UnknownError", errorMessage: "Unknown error" };
    }

    const cause = asRecord(record.cause);
    const causeError = asRecord(cause?.err);
    const detailsRecord = asRecord(record.details);
    const normalized: NormalizedAuthError = {
      errorType: optionalSafeString(record.type, 100),
      errorName: optionalSafeString(record.name, 100),
      errorMessage: optionalSafeString(record.message),
      causeName: optionalSafeString(cause?.name, 100),
      causeMessage: optionalSafeString(cause?.message),
      causeErrorName: optionalSafeString(causeError?.name, 100),
      causeErrorMessage: optionalSafeString(causeError?.message),
      provider: readProvider(record.provider, detailsRecord?.provider, cause?.provider),
    };

    if (isSafelyStructured(record.details)) {
      normalized.details = sanitizeAuthDetails(record.details);
    }

    return Object.fromEntries(
      Object.entries(normalized).filter(([, value]) => value !== undefined),
    ) as NormalizedAuthError;
  } catch {
    return {
      errorName: "UnloggableAuthError",
      errorMessage: "Authentication error metadata could not be normalized",
    };
  }
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
