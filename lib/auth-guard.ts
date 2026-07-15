import "server-only";

import type { UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/auth";

export class AuthorizationError extends Error {
  status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError("Authentication required", 401);
  }

  return session.user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("Insufficient permissions", 403);
  }

  return user;
}