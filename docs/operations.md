# Operations runbook

## Deploy and verify

1. Configure `DATABASE_URL` with TLS hostname/certificate verification (`sslmode=verify-full` where supported), Auth.js, S3 and email secrets.
2. Keep Sentry variables empty to run without external reporting, or configure both DSNs, environment/release, organization, project and a server-only auth token.
3. Run schema validation, typecheck, tests, coverage, lint and a production build before deployment.
4. After deployment, call `GET /api/health` and `GET /api/ready`; confirm `200`, `cache-control: no-store` and `x-request-id`. Confirm `POST` receives `405`.
5. Exercise sign-in and one authorized dashboard path. Check browser/server output for hydration failures, unexpected Sentry traffic and `client.query()` concurrency warnings.

## Log fields and privacy

API completion records contain `timestamp`, `level`, `message`, `requestId`, stable `route`, `method`, `status` and `durationMs`. Error records contain a normalized error name/message and may contain a provider code, status or provider request ID. Never add bodies, cookies, authorization headers, emails, filenames, raw invitation tokens, S3 object keys, signed URLs, comments or rejection reasons to log context.

Use `x-request-id` to correlate a user-visible failure with server logs. Metric records are emitted only when `METRICS_LOG_ENABLED=true`; labels must remain low-cardinality.

## Incident and rollback

If readiness fails while health succeeds, treat PostgreSQL reachability, TLS/certificate configuration and pool capacity as the first checks. A failed Sentry integration must not block the application: clear both DSNs and redeploy. If the release itself is unhealthy, roll back the application artifact and environment configuration together. This feature has no database migration or destructive rollback step.

## Rate-limit review

No limiter is introduced in this change. Before public production exposure, select an infrastructure-backed limiter that works across instances and define trusted proxy/IP handling. Recommended policies:

| Endpoint | Suggested key | Starting policy | Notes |
| --- | --- | --- | --- |
| Auth sign-in/callback | IP plus normalized account identifier | 5–10 attempts / 15 min | Never log the identifier or password. Apply stricter failure limits and a broader IP burst limit. |
| Invitation accept/resend | IP plus invitation/user hash | 5 attempts / 15 min; resend cooldown already applies | Do not key or log the raw invitation token. |
| Upload presign/complete | authenticated user ID plus organization | 30 / min with bounded burst | Keep file-size/type validation; do not log filename, object key or signed URL. |
| Client download URL | authenticated user ID | 60 / min | Preserve role/document authorization before issuing a URL. |
| Email worker trigger | trusted scheduler identity/IP | 2 / min | Keep the 32+ character bearer secret and bounded batch size. |
| Health/readiness | deployment/internal network | modest infrastructure limit | Exclude expected failures from error reporting; avoid aggressive limits that break orchestration probes. |

Return `429` with a bounded retry hint when a limiter is later implemented. The limiter must not change role scopes or rely on process-local memory in a horizontally scaled deployment.
