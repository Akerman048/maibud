import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import type { UserRole } from "@/app/generated/prisma/client";
import {
  createAuthAdapter,
  createGoogleProvider,
  inspectGoogleSignIn,
} from "@/lib/google-oauth";
import { logger } from "@/lib/logger";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const isProduction = process.env.NODE_ENV === "production";
const googleProvider = createGoogleProvider();

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  adapter: createAuthAdapter(),
  trustHost:
    !isProduction || process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: isProduction,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  logger: {
    error(error) {
      logger.error("Auth.js authentication error", {
        errorType: error.name,
      });
    },
    warn(code) {
      logger.warn("Auth.js authentication warning", { code });
    },
    debug(message) {
      if (
        process.env.NODE_ENV !== "production" &&
        typeof message === "string" &&
        message.startsWith("adapter_")
      ) {
        logger.debug("Auth.js adapter operation", {
          adapterOperation: message.slice("adapter_".length, 100),
        });
      }
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Пароль",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: parsed.data.email.toLowerCase(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (!user?.passwordHash || !user.isActive) {
          return null;
        }

        const passwordIsValid = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordIsValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile || !account.providerAccountId) return false;

      const currentSession = await auth();
      return inspectGoogleSignIn(
        profile,
        account.providerAccountId,
        currentSession?.user?.id,
      );
    },

    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        return new URL(url).origin === baseUrl ? url : baseUrl;
      } catch {
        return baseUrl;
      }
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }

      if ((user || trigger === "update") && token.userId) {
        const trustedUser = await prisma.user.findUnique({
          where: { id: String(token.userId) },
          select: {
            role: true,
            isActive: true,
            organizationMemberships: {
              where: { removedAt: null },
              select: { id: true },
              take: 1,
            },
          },
        });

        if (!trustedUser?.isActive) return null;
        token.role = trustedUser.role;
        token.onboardingRequired =
          trustedUser.organizationMemberships.length === 0;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user && token.userId && token.role) {
        session.user.id = String(token.userId);
        session.user.role = token.role as UserRole;
        session.user.onboardingRequired = token.onboardingRequired === true;
      }

      return session;
    },
  },
});
