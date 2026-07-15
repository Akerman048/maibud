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

HEAD creates an invitation and assigns its organization role; invitees cannot choose a role themselves. Invitation links contain a one-time raw token, while PostgreSQL stores only its SHA-256 hash. Email delivery is intentionally not connected yet, so the generated URL must be copied and sent manually.

After deploying the organization-membership migration, backfill existing project members without deleting or changing existing data:

```bash
pnpm exec tsx scripts/backfill-organization-members.ts
```

Run the backfill explicitly against the intended environment. It is never executed by CI or migrations. The summary reports users without project or organization evidence instead of guessing their organization; assign those users manually after review. Because Auth.js uses JWT sessions, users should sign in again after an organization role change so the dashboard redirect uses the updated global compatibility role. An existing user cannot accept an invitation with a conflicting role while they retain active memberships in another organization, because the current dashboard still relies on one global compatibility role.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
