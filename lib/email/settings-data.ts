import "server-only";

import { prisma } from "@/lib/prisma";

export async function getEmailSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailNotificationsEnabled: true,
      emailDocumentUpdates: true,
      emailCommentUpdates: true,
      emailMembershipUpdates: true,
    },
  });

  if (!user) {
    throw new Error("Current user was not found");
  }

  return user;
}
