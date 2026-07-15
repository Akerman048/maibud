This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Testing

```bash
pnpm run test
pnpm run test:watch
pnpm run test:coverage
pnpm run lint
pnpm run build
```

Unit tests exercise deterministic business rules and do not connect to Neon or S3. CI uses placeholder environment values and does not run migrations or seed scripts.

## Organization invitations

HEAD creates an invitation and assigns its organization role; invitees cannot choose a role themselves. Invitation links contain a one-time raw token, while the `Invitation` row stores only its SHA-256 hash. The raw link is queued in a short-lived email job during create/resend, and the generated URL is still shown to HEAD as a manual-delivery fallback.

After deploying the organization-membership migration, backfill existing project members without deleting or changing existing data:

```bash
pnpm exec tsx scripts/backfill-organization-members.ts
```

Run the backfill explicitly against the intended environment. It is never executed by CI or migrations. The summary reports users without project or organization evidence instead of guessing their organization; assign those users manually after review. Because Auth.js uses JWT sessions, users should sign in again after an organization role change so the dashboard redirect uses the updated global compatibility role. An existing user cannot accept an invitation with a conflicting role while they retain active memberships in another organization, because the current dashboard still relies on one global compatibility role.

## Comment threads

Document remarks are stored as discussion threads. An EXPERT creates a thread for a document or a specific document version; EXPERT and DESIGNER project members can reply. A DESIGNER marks an OPEN or RETURNED thread as completed (`RESOLVED`), and an EXPERT can return it for further work (`RETURNED`). Messages use soft delete and retain their database content for auditability.

The legacy `Comment` table remains available during the transition. After deploying the additive comment-thread migration, migrate legacy rows explicitly with:

```bash
pnpm exec tsx scripts/backfill-comment-threads.ts
```

The backfill uses `legacyCommentId` as an idempotency marker, does not modify or delete legacy comments, and is never run by migrations or CI. Comment-thread Server Actions create internal notifications in the same database transaction as each thread event.

## Notifications

Internal notifications are stored in PostgreSQL and are always queried by their owner `userId`. Read state is represented by `readAt`; list pages use server-side filtering and pagination, while DashboardLayout performs one count query for the Sidebar unread badge. Document submission, version upload, review, client publication, comment-thread activity, project membership, invitation acceptance, and project archival create notifications in the same transaction as the business change when possible.

Notification targets are generated from trusted entity ids and role-aware internal routes. Arbitrary external URLs are rejected. Polling, WebSocket, and external realtime services are intentionally not part of this module.

## Email delivery

Email delivery uses a transactional outbox. A business transaction creates the internal `Notification` and its eligible `EmailJob` together; it never calls Resend. The job moves through `PENDING`/`FAILED` → `PROCESSING` → `SENT`, or becomes `CANCELLED` after five attempts. Retries use delays of 1 minute, 5 minutes, 15 minutes, and 1 hour. Stale processing locks are released after 15 minutes, and atomic claims prevent two workers from sending the same job.

Required environment variables:

```bash
APP_URL=http://localhost:3000
RESEND_API_KEY=re_placeholder
EMAIL_FROM="ExpertDesk <notifications@example.com>"
EMAIL_JOB_SECRET=replace-with-at-least-32-random-characters
```

Trigger a bounded worker batch with `POST /api/internal/email-jobs/process` and `Authorization: Bearer $EMAIL_JOB_SECRET`, or process one local batch explicitly:

```bash
pnpm exec tsx scripts/process-email-jobs.ts
```

The worker is never started by migrations, seed, build, or CI. Resend is initialized lazily only while processing jobs. Users control global, document, comment, and membership email categories from their role-specific settings page. Unsupported/noisy events such as document unpublish and project archive remain internal-only. Invitation resend has a 60-second cooldown, invalidates the previous token, and cancels its unsent email job. Successfully sent and terminally failed jobs replace payload data with sanitized metadata so one-time invitation links are not retained.

The optional HEAD email-job observability page is intentionally deferred; inspect operational metrics through database tooling without exposing payloads or invitation URLs in the application UI.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
