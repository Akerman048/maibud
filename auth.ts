import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import type { UserRole } from "@/app/generated/prisma/client";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const isProduction = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost:
    !isProduction || process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: isProduction,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
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
  ],

  callbacks: {
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

    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId);
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
});
