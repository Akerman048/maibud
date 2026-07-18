import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { z } from "zod";

import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const googleEmailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((email) => email.toLowerCase());

const googleProfileSchema = z
  .object({
    sub: z.string().trim().min(1).max(255),
    email: googleEmailSchema,
    email_verified: z.literal(true),
    name: z.unknown().optional(),
  })
  .passthrough();

type GoogleOAuthEnvironment = Partial<
  Record<"AUTH_GOOGLE_ID" | "AUTH_GOOGLE_SECRET", string | undefined>
>;

export class InvalidGoogleProfileError extends Error {
  constructor() {
    super("Google did not return a valid verified email");
    this.name = "InvalidGoogleProfileError";
  }
}

export class GoogleAccountLinkingNotSupportedError extends Error {
  constructor() {
    super("Authenticated Google account linking is not enabled");
    this.name = "GoogleAccountLinkingNotSupportedError";
  }
}

function normalizeGoogleName(value: unknown, fallbackEmail: string) {
  if (typeof value !== "string") return fallbackEmail;

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 200) : fallbackEmail;
}

export function parseGoogleProfile(profile: unknown) {
  const parsed = googleProfileSchema.safeParse(profile);

  if (!parsed.success) {
    throw new InvalidGoogleProfileError();
  }

  return {
    id: parsed.data.sub,
    email: parsed.data.email,
    name: normalizeGoogleName(parsed.data.name, parsed.data.email),
    image: null,
    // This trusted constant only satisfies the application User type. The
    // adapter independently assigns the initial database role below.
    role: UserRole.DESIGNER,
  };
}

export function getGoogleOAuthCredentials(
  environment: GoogleOAuthEnvironment = process.env as GoogleOAuthEnvironment,
) {
  const clientId = environment.AUTH_GOOGLE_ID?.trim();
  const clientSecret = environment.AUTH_GOOGLE_SECRET?.trim();

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(
      "Google OAuth requires both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET",
    );
  }

  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function createGoogleProvider(
  environment: GoogleOAuthEnvironment = process.env as GoogleOAuthEnvironment,
) {
  const credentials = getGoogleOAuthCredentials(environment);
  if (!credentials) return null;

  return Google({
    ...credentials,
    // Google is the only OAuth provider allowed to link by email. The profile
    // callback and sign-in gate below require Google's verified email signal.
    allowDangerousEmailAccountLinking: true,
    authorization: {
      params: { scope: "openid email profile" },
    },
    profile(profile: GoogleProfile) {
      return parseGoogleProfile(profile);
    },
  });
}

function isProviderAccountUniqueError(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  return (
    (Array.isArray(target) &&
      target.length === 2 &&
      target[0] === "provider" &&
      target[1] === "providerAccountId") ||
    target === "Account_provider_providerAccountId_key"
  );
}

export function createAuthAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma as never);

  return {
    ...baseAdapter,
    async createUser(user: AdapterUser) {
      const email = googleEmailSchema.safeParse(user.email);
      if (!email.success) throw new InvalidGoogleProfileError();

      return prisma.user.create({
        data: {
          name: normalizeGoogleName(user.name, email.data),
          email: email.data,
          emailVerified: new Date(),
          role: UserRole.DESIGNER,
        },
      }) as Promise<AdapterUser>;
    },
    async getUserByEmail(email) {
      return prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      }) as Promise<AdapterUser | null>;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return (account?.user ?? null) as AdapterUser | null;
    },
    async linkAccount(account: AdapterAccount) {
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
        select: {
          isActive: true,
          passwordHash: true,
          createdAt: true,
          accounts: { select: { id: true }, take: 1 },
          organizationMemberships: { select: { id: true }, take: 1 },
        },
      });
      const isFreshOAuthUser =
        user !== null &&
        user.isActive &&
        user.passwordHash === null &&
        user.accounts.length === 0 &&
        user.organizationMemberships.length === 0 &&
        Date.now() - user.createdAt.getTime() < 5 * 60 * 1000;
      const isExistingActiveGoogleUser =
        account.provider === "google" && user?.isActive === true;

      if (!isFreshOAuthUser && !isExistingActiveGoogleUser) {
        throw new GoogleAccountLinkingNotSupportedError();
      }

      const identity = {
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      };

      try {
        return (await prisma.account.create({ data: identity })) as unknown as AdapterAccount;
      } catch (error) {
        if (isProviderAccountUniqueError(error)) {
          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (existing?.userId === account.userId) {
            return existing as unknown as AdapterAccount;
          }
        }

        if (isFreshOAuthUser) {
          await prisma.user
            .deleteMany({
              where: {
                id: account.userId,
                passwordHash: null,
                accounts: { none: {} },
                organizationMemberships: { none: {} },
              },
            })
            .catch(() => undefined);
        }

        throw error;
      }
    },
  };
}

export async function inspectGoogleSignIn(
  profile: unknown,
  providerAccountId: string,
  authenticatedUserId?: string,
) {
  const googleUser = parseGoogleProfile(profile);
  const linkedAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId,
      },
    },
    include: { user: { select: { id: true, isActive: true } } },
  });

  if (linkedAccount) {
    return (
      linkedAccount.user.isActive &&
      (!authenticatedUserId || linkedAccount.user.id === authenticatedUserId)
    );
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: googleUser.email, mode: "insensitive" } },
    select: { id: true, isActive: true },
  });

  if (existingUser && !existingUser.isActive) return false;
  if (authenticatedUserId && existingUser?.id !== authenticatedUserId) {
    return false;
  }

  return true;
}
