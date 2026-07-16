# Production deployment

This guide covers deployment configuration only. Database migrations, seed scripts, the email worker, and S3 data changes are separate, explicitly approved operations.

## 1. Runtime contract

- Node.js `22.x` and pnpm `11.x` are the supported production toolchain.
- Copy `.env.example` to a secret store or `.env.production`; never commit the populated file.
- Set `AUTH_URL` and `APP_URL` to the exact canonical HTTPS origin, without a trailing path. Set `AUTH_TRUST_HOST=true` only behind the trusted Render or Vercel proxy.
- Generate independent, random values of at least 32 characters for `AUTH_SECRET` and `EMAIL_JOB_SECRET`.
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
