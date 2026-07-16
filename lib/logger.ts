const REDACTED = "[REDACTED]";
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 500;

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|passwd|secret|token|apikey|api_key|session|jwt|objectkey|presigned|uploadurl|downloadurl|databaseurl|connectionstring|payload|comment|rejectionreason|content)/i;

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

function sanitizeString(value: string) {
  const sanitized = value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/https?:\/\/[^\s?]+\?[^\s]+/gi, "[REDACTED_SIGNED_URL]")
    .replace(/organizations\/[A-Za-z0-9/_.,+() -]+/gi, "[REDACTED_OBJECT_KEY]")
    .replace(/\b[^\s/\\]+\.(?:pdf|docx?|xlsx?|dwg|png|jpe?g)\b/gi, "[REDACTED_FILENAME]");
  return sanitized.length > MAX_STRING_LENGTH
    ? `${sanitized.slice(0, MAX_STRING_LENGTH)}…`
    : sanitized;
}

function sanitizeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return undefined;
  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }
  if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return sanitizeValue(
      { name: value.name, message: value.message },
      depth + 1,
      seen,
    );
  }
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = REDACTED;
      continue;
    }
    const sanitized = sanitizeValue(item, depth + 1, seen);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

export function sanitizeLogContext(value: unknown): unknown {
  return sanitizeValue(value, 0, new WeakSet());
}

export function createLogRecord(
  level: LogLevel,
  message: string,
  context: LogContext = {},
) {
  const safeContext = sanitizeLogContext(context) as LogContext;
  return {
    ...safeContext,
    timestamp: new Date().toISOString(),
    level,
    message: sanitizeString(message),
  };
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const line = JSON.stringify(createLogRecord(level, message, context));
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug") console.debug(line);
  else console.info(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
