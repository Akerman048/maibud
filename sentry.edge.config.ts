import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "@/lib/sentry-safety";

const dsn = process.env.SENTRY_DSN?.trim();
Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.APP_VERSION,
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  beforeSend: sanitizeSentryEvent,
});
