import { sanitizeLogContext } from "@/lib/logger";

type SentryLikeEvent = {
  request?: { url?: string; data?: unknown; headers?: Record<string, string> };
  user?: unknown;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
};

export function sanitizeSentryEvent<T extends SentryLikeEvent>(event: T): T | null {
  const pathname = event.request?.url
    ? (() => {
        try {
          return new URL(event.request.url, "http://localhost").pathname;
        } catch {
          return "";
        }
      })()
    : "";

  if (pathname === "/api/health" || pathname === "/api/ready") return null;
  if (event.tags?.expected === true || event.tags?.expected === "true") return null;

  const sanitized = sanitizeLogContext(event) as T;
  delete sanitized.user;
  if (sanitized.request) {
    delete sanitized.request.data;
    delete sanitized.request.headers;
  }
  return sanitized;
}
