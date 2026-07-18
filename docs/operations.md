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

Public organization registration has a process-local limit of 5 requests per 15 minutes per client IP. Client IP headers are read only on the supported Render and Vercel deployments. This limit is suitable for one instance only: before scaling horizontally, replace its in-memory store with an infrastructure-backed limiter shared by every instance.

Invitation create, resend, revoke, and acceptance operations use the same process-local design with operation-specific counters (5 attempts per 15 minutes per client IP). Public invitation inspection allows 30 attempts per 15 minutes per client IP. These counters are not shared across processes or instances.

Recommended policies for the remaining endpoints:

| Endpoint | Suggested key | Starting policy | Notes |
| --- | --- | --- | --- |
| Auth sign-in/callback | IP plus normalized account identifier | 5–10 attempts / 15 min | Never log the identifier or password. Apply stricter failure limits and a broader IP burst limit. |
| Invitation create/accept/resend/revoke | Client IP, separated by operation | 5 attempts / 15 min; resend cooldown also applies | The raw invitation token is never a limiter key or log field. |
| Upload presign/complete | authenticated user ID plus organization | 30 / min with bounded burst | Keep file-size/type validation; do not log filename, object key or signed URL. |
| Client download URL | authenticated user ID | 60 / min | Preserve role/document authorization before issuing a URL. |
| Email worker trigger | trusted scheduler identity/IP | 2 / min | Keep the 32+ character bearer secret and bounded batch size. |
| Health/readiness | deployment/internal network | modest infrastructure limit | Exclude expected failures from error reporting; avoid aggressive limits that break orchestration probes. |

Infrastructure-backed limits should return `429` with a bounded retry hint. A future distributed limiter must not change role scopes or rely on process-local memory in a horizontally scaled deployment.

## Invitation lifecycle

- Organization invitations expire after 72 hours.
- Public tokens contain 32 bytes of cryptographically secure randomness encoded as base64url. PostgreSQL stores only the SHA-256 token hash under a unique constraint.
- Acceptance requires an authenticated, active user whose normalized email matches the invitation. `User.role` is the dashboard/session authority and organization/project roles mirror it. A different invitation role is allowed only when the user has no other active organization membership; acceptance then updates `User.role` transactionally and requires a fresh login. The invitation claim, role update, membership change, project assignment, notification, email-job cancellation, and audit records execute in one serializable transaction.
- Invitations are single-use. Accepted, revoked, and expired invitations cannot be accepted again. An existing active membership with the same role is treated as idempotent acceptance and is not duplicated.
- Resend rotates the token hash and expiration, invalidating the previous link. Revocation and rotation cancel any older pending invitation email job.
- Creating or rotating an invitation returns the new relative invitation URL only to the trusted HEAD server action. The `Invitation` row, audit records, and application logs never receive the plaintext token.
- Creation and rotation queue the existing invitation email job. The plaintext link exists only in that purpose-built short-lived job payload and the action result shown to HEAD; delivery still depends on the separately enabled email worker. Rotation, revocation, and successful acceptance cancel stale pending invitation jobs.
- Invitation administration derives the organization from the authenticated HEAD membership. Client-supplied organization IDs are ignored for create, resend, and revoke.
- New-user onboarding remains intentionally deferred: the invitation page identifies when no active account exists, but it does not create credentials or redirect into the public organization-creation form. The next product task is a dedicated invitation registration endpoint/page that locks the normalized email to the invitation, authenticates the new user, and returns to the same safe relative invitation URL.
