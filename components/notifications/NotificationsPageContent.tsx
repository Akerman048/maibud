import type { UserRole } from "@/app/generated/prisma/client";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/app/dashboard/notifications/actions";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { NotificationsView } from "@/components/notifications/NotificationsView";
import {
  getNotificationsForUser,
  normalizeNotificationQuery,
} from "@/lib/notification-data";
import { getNotificationPageHref } from "@/lib/notification-policy";

type NotificationsPageContentProps = {
  userId: string;
  role: UserRole;
  searchParams: {
    page?: string | string[];
    pageSize?: string | string[];
    filter?: string | string[];
  };
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function NotificationsPageContent({
  userId,
  role,
  searchParams,
}: NotificationsPageContentProps) {
  const query = normalizeNotificationQuery({
    page: Number(firstQueryValue(searchParams.page)),
    pageSize: Number(firstQueryValue(searchParams.pageSize)),
    filter: firstQueryValue(searchParams.filter),
  });
  const data = await getNotificationsForUser({
    userId,
    ...query,
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Сповіщення"
          subtitle={`Непрочитаних: ${data.unreadCount}`}
        />
        <NotificationsView
          data={data}
          filter={query.filter}
          basePath={getNotificationPageHref(role)}
          markReadAction={markNotificationAsRead}
          markAllReadAction={markAllNotificationsAsRead}
        />
      </div>
    </DashboardLayout>
  );
}
