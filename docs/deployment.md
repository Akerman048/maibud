# Production deployment

This guide covers deployment configuration only. Database migrations, seed scripts, the email worker, and S3 data changes are separate, explicitly approved operations.

## 1. Runtime contract

- Node.js `22.x` and pnpm `11.x` are the supported production toolchain.
- Copy `.env.example` to a secret store or `.env.production`; never commit the populated file.
- Set `AUTH_URL` and `APP_URL` to the exact canonical HTTPS origin, without a trailing path. Set `AUTH_TRUST_HOST=true` only behind the trusted Render or Vercel proxy.
- Generate independent, random values of at least 32 characters for `AUTH_SECRET` and `EMAIL_JOB_SECRET`.
- Google authentication is enabled only when both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set. Leaving both absent intentionally disables the provider; setting only one fails startup clearly. These values are server-only and must never use a `NEXT_PUBLIC_` prefix.
- Public `NEXT_PUBLIC_*` values are embedded at build time. All other secrets must be runtime variables.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are build-only values for source-map upload. Do not pass the token as a Docker build argument because build arguments can be retained in image metadata or cache.

Before a release, validate the secret set against `.env.example` and run:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm exec prisma generate
pnpm run typecheck
pnpm run test
pnpm run test:coverage
pnpm run lint
pnpm run build
```

The build, web startup, and CI workflows do not run migrations, seed data, S3 calls, or Resend calls.

## 2. Docker and Render

The Dockerfile uses a cached dependency stage, a standalone Next.js build, and a minimal non-root Alpine runtime. Build and test it locally with production-equivalent secrets:

```bash
docker build -t maibud:production .
docker run --rm --env-file .env.production -p 3000:3000 maibud:production
```

`docker compose up --build` uses `.env.production` when present. The container liveness probe calls `/api/health`; configure the platform readiness probe to call `/api/ready`. Readiness touches PostgreSQL with a bounded timeout, while liveness never touches external services.

For Render, deploy the repository as a Docker web service, expose port `3000`, set the health-check path to `/api/health`, and store runtime variables in the service environment. Use a pre-deploy command only after reviewing pending migrations; never run `prisma migrate dev` in production. Keep at least one previous immutable image available for rollback.

### Google Cloud OAuth client

Create a Web application OAuth client in Google Cloud and configure only the authentication scopes `openid`, `email`, and `profile`. Gmail API scopes and offline access are not used. Add these exact entries:

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://maibud.onrender.com`

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://maibud.onrender.com/api/auth/callback/google`

The callback path comes from this repository's Auth.js catch-all route at `app/api/auth/[...nextauth]/route.ts`. Store the client ID as `AUTH_GOOGLE_ID` and the client secret as `AUTH_GOOGLE_SECRET`. Never commit either value.

New Google users are created in a deliberately incomplete state and redirected to `/onboarding`, where they must provide the real organization name and accept the terms. Organization, `HEAD` membership, trusted global role, and audit log are then created in one serializable transaction. Until that completes, dashboard guards redirect the user back to onboarding. For Google only, an existing active credentials user is linked automatically when Google returns the same normalized, valid, verified email. The link stores only Google provider identity; passwords, roles, memberships, preferences, and provider tokens are not changed or persisted. Missing, malformed, unverified, mismatched, or inactive-user profiles are rejected.

## 3. Vercel

Import the repository as a Next.js project and use the repository's Node/pnpm versions. Configure separate Preview and Production environments. Production `AUTH_URL` and `APP_URL` must use the production domain; previews need their own callback origin and should not share production credentials or the production S3 write policy.

Vercel does not use this repository's Docker healthcheck. Monitor `/api/health` externally and use `/api/ready` only when database readiness is required. Do not run database migrations from parallel build jobs; use one controlled release job instead.

## 4. Neon and Prisma

Use Neon's pooled connection endpoint for the web runtime. Keep TLS hostname/certificate verification enabled. Start with `PG_POOL_MAX=5` per long-running instance and reduce it for highly parallel serverless deployments so total connections remain below the Neon plan limit. The runtime bounds connection, idle, statement, query, and idle-transaction timeouts and disconnects Prisma on `SIGINT`/`SIGTERM`.

Run reviewed migrations once, from a controlled release environment using a direct Neon connection if required by the provider:

```bash
DATABASE_URL="<reviewed-direct-neon-url>" pnpm exec prisma migrate deploy
```

This command is documentation only; it is intentionally absent from build, startup, Docker, and CI.

### Evidence-based repair for users disabled by membership removal

Older application code globally disabled a user when their final organization membership was removed. Do not reactivate all inactive users: `isActive = false` may also represent an intentional administrative decision. Repair only a specific email after confirming all of the following in the database:

- the user is inactive and has `disabledAt` set;
- the user has no active `OrganizationMember` rows;
- at least one membership has `removedAt` set;
- an AuditLog entry named `Користувача видалено з організації` references that membership within 60 seconds of `disabledAt`.

Use a reviewed database console and one transaction. Replace the placeholder with exactly one normalized email, run the `SELECT` first, and continue only when it identifies the intended user:

```sql
BEGIN;

SELECT
  u."id",
  u."isActive",
  u."disabledAt",
  m."removedAt",
  a."createdAt" AS "removalAuditAt"
FROM "User" u
JOIN "OrganizationMember" m ON m."userId" = u."id"
JOIN "AuditLog" a ON a."entityId" = m."id"
WHERE lower(u."email") = lower('user@example.com')
  AND u."isActive" = false
  AND u."disabledAt" IS NOT NULL
  AND m."removedAt" IS NOT NULL
  AND a."action" = 'Користувача видалено з організації'
  AND abs(extract(epoch FROM (a."createdAt" - u."disabledAt"))) <= 60;

UPDATE "User" u
SET
  "isActive" = true,
  "disabledAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE lower(u."email") = lower('user@example.com')
  AND u."isActive" = false
  AND u."disabledAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "OrganizationMember" active_membership
    WHERE active_membership."userId" = u."id"
      AND active_membership."removedAt" IS NULL
  )
  AND EXISTS (
    SELECT 1
    FROM "OrganizationMember" removed_membership
    JOIN "AuditLog" removal_audit
      ON removal_audit."entityId" = removed_membership."id"
    WHERE removed_membership."userId" = u."id"
      AND removed_membership."removedAt" IS NOT NULL
      AND removal_audit."action" = 'Користувача видалено з організації'
      AND abs(extract(epoch FROM (removal_audit."createdAt" - u."disabledAt"))) <= 60
  )
RETURNING u."id", u."isActive", u."disabledAt";

-- COMMIT only when UPDATE returned exactly one reviewed user.
-- Otherwise use ROLLBACK and investigate.
COMMIT;
```

This repair changes only global account availability. It does not restore memberships, roles, projects, or invitations; a new validated invitation must do that through the normal acceptance transaction.

## 5. AWS S3

Keep the bucket private and grant the application role only the required object actions for the configured bucket/prefix. Prefer an IAM role or workload identity. Static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are needed only when the host cannot provide workload credentials.

The application signs bounded single-part `PutObject` uploads; `MAX_DOCUMENT_FILE_SIZE` defaults to 25 MiB. Multipart upload is intentionally not enabled, so there are no orphaned multipart sessions to clean up. The AWS client uses standard retries with a maximum of three attempts and bounded connection, request, and socket timeouts.

Configure bucket CORS with exact origins wherever possible. A minimal policy is:

```json
[
  {
    "AllowedOrigins": ["https://app.example.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type", "x-amz-checksum-sha256", "x-amz-sdk-checksum-algorithm"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Remove localhost from the production bucket unless local development must use that bucket. Do not use unrestricted `*` origins with production write credentials. If Vercel previews need upload access, use a separate non-production bucket or an explicitly reviewed preview-origin policy.

## 6. Resend and email worker

Verify the production sending domain and set `EMAIL_FROM` to an address on that domain. The web process only writes email jobs to PostgreSQL. Delivery occurs only when an authorized scheduler calls `POST /api/internal/email-jobs/process` with `Authorization: Bearer $EMAIL_JOB_SECRET`.

Enable that scheduler after the application, database migrations, sender domain, and monitoring have been verified. Rotate the worker secret independently from the Auth.js secret. Never expose raw invitation URLs in logs or observability tools.

## 7. CORS, headers, and caching

Application APIs are same-origin and intentionally do not emit permissive CORS headers. Localhost is allowed only for the Next.js development server. S3 CORS is configured on the bucket as described above.

Production responses set CSP, clickjacking, MIME-sniffing, referrer, permissions, and HSTS policies. CSP permits only the application, Sentry ingest, and HTTPS AWS object endpoints needed for presigned transfers. Authenticated dashboard pages and health endpoints remain dynamic/no-store; Next.js controls immutable framework asset caching. Do not add a global public cache header to authenticated pages.

## 8. CI, release, and rollback

GitHub Actions installs with a frozen lockfile, validates and generates Prisma, then runs typecheck, lint, tests, coverage, and the production build. CI uses placeholders and does not connect to PostgreSQL, S3, or Resend.

Recommended release order:

1. Review the diff, dependency lockfile, Prisma migration status, and provider variables.
2. Run the complete verification suite in CI.
3. Build one immutable artifact and record `APP_VERSION`/Sentry release metadata.
4. Apply already-reviewed additive migrations once, if any.
5. Deploy the artifact and verify `/api/health`, `/api/ready`, login, a read-only dashboard page, and security headers.
6. Enable the email scheduler only after the web deployment is healthy.

For rollback, restore the previous immutable application artifact first. Do not automatically roll back a database migration or delete S3 objects. If a schema change is not backward-compatible, stop and use its reviewed forward-fix or rollback procedure.
