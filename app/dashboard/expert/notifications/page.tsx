import { UserRole } from "@/app/generated/prisma/client";
import { NotificationsPageContent } from "@/components/notifications/NotificationsPageContent";
import { requireRole } from "@/lib/auth-guard";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpertNotificationsPage({ searchParams }: PageProps) {
  const currentUser = await requireRole([UserRole.EXPERT]);

  return (
    <NotificationsPageContent
      userId={currentUser.id}
      role={currentUser.role}
      searchParams={await searchParams}
    />
  );
}
