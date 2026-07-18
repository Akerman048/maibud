import { NotificationType, type UserRole } from "@/app/generated/prisma/client";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/app/dashboard/notifications/actions";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { NotificationsView } from "@/components/notifications/NotificationsView";
import {
  getNotificationsForUser,
  normalizeNotificationSearchParams,
} from "@/lib/notification-data";
import { getNotificationPageHref } from "@/lib/notification-policy";
import { SearchInput } from "@/components/search/SearchInput";
import { FilterBar } from "@/components/search/FilterBar";
import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { getProjectOptions } from "@/lib/projects";

type NotificationsPageContentProps = {
  userId: string;
  role: UserRole;
  searchParams: Record<string, string | string[] | undefined>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function NotificationsPageContent({
  userId,
  role,
  searchParams,
}: NotificationsPageContentProps) {
  const query = normalizeNotificationSearchParams(searchParams);
  const basePath = getNotificationPageHref(role);
  const [data, projects] = await Promise.all([getNotificationsForUser({ userId, ...query }), getProjectOptions(userId, role)]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Сповіщення"
          subtitle={`Непрочитаних: ${data.unreadCount}`}
        />
        <SearchInput key={query.search} defaultValue={query.search} label="Пошук сповіщення" />
        <form action={basePath}><FilterBar>
          {query.search && <input type="hidden" name="search" value={query.search} />}
          <input type="hidden" name="pageSize" value={query.pageSize} />
          <input type="hidden" name="filter" value={query.filter} />
          <input type="hidden" name="sortBy" value={query.sortBy} />
          <input type="hidden" name="sortDirection" value={query.sortDirection} />
          {firstQueryValue(searchParams.actorId) && <input type="hidden" name="actorId" value={firstQueryValue(searchParams.actorId)} />}
          <label className="sr-only" htmlFor="notification-type">Тип</label><Select id="notification-type" name="type" defaultValue={query.type ?? ""} options={[{ value: "", label: "Усі типи" }, ...Object.values(NotificationType).map((type) => ({ value: type, label: type.replaceAll("_", " ") }))]} />
          <label className="sr-only" htmlFor="notification-project">Проєкт</label><Select id="notification-project" name="projectId" defaultValue={query.projectId ?? ""} options={[{ value: "", label: "Усі проєкти" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} />
          <DateRangeFilter from={firstQueryValue(searchParams.createdFrom)} to={firstQueryValue(searchParams.createdTo)} label="Дата створення" />
          <Button type="submit">Застосувати</Button><Button asChild type="button" variant="secondary"><Link href={basePath}>Очистити фільтри</Link></Button>
        </FilterBar></form>
        <div className="flex justify-end"><PageSizeSelect value={query.pageSize} /></div>
        <NotificationsView
          data={data}
          filter={query.filter}
          basePath={basePath}
          markReadAction={markNotificationAsRead}
          markAllReadAction={markAllNotificationsAsRead}
        />
      </div>
    </DashboardLayout>
  );
}
