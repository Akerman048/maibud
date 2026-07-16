import { UserRole } from "@/app/generated/prisma/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { TeamManagement } from "@/components/organization/TeamManagement";
import { Card } from "@/components/ui/Card";
import {
  getCurrentHeadOrganization,
  getOrganizationProjects,
  getPendingInvitations,
} from "@/lib/organization-members";
import { requireDashboardRole } from "@/lib/require-dashboard-role";
import { searchOrganizationMembers } from "@/lib/member-search";
import { firstQueryValue, normalizeBooleanFilter, normalizeSearchQuery, parsePage, parsePageSize, parseSortDirection } from "@/lib/query-params";
import { SearchInput } from "@/components/search/SearchInput";
import { FilterBar } from "@/components/search/FilterBar";
import { PageSizeSelect } from "@/components/search/PageSizeSelect";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { SortSelect } from "@/components/search/SortSelect";
import { getUserRoleLabel } from "@/lib/user-role";

export default async function HeadMembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const currentUser = await requireDashboardRole(UserRole.HEAD);
  const [organization, raw] = await Promise.all([getCurrentHeadOrganization(currentUser.id), searchParams]);

  if (!organization) {
    return (
      <DashboardLayout>
        <Card className="p-8">
          <h1 className="text-xl font-bold">Немає доступної організації</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Для керування командою потрібне активне членство керівника організації.
          </p>
        </Card>
      </DashboardLayout>
    );
  }

  const value = (key: string) => firstQueryValue(raw[key]);
  const rawRole = value("role");
  const active = normalizeBooleanFilter(value("active"));
  const sortBy = value("sortBy");
  const normalizedSortBy: "name" | "role" | "createdAt" =
    sortBy === "name" || sortBy === "role" ? sortBy : "createdAt";
  const memberQuery = {
    organizationId: organization.id,
    page: parsePage(value("page")), pageSize: parsePageSize(value("pageSize")),
    search: normalizeSearchQuery(value("search")),
    role: rawRole && Object.values(UserRole).includes(rawRole as UserRole) ? rawRole as UserRole : undefined,
    active: active === "all" ? undefined : active === "true",
    projectId: value("projectId"),
    sortBy: normalizedSortBy,
    sortDirection: parseSortDirection(value("sortDirection")),
  };
  const invitationPage = parsePage(value("invitationPage"));
  const invitationPageSize = parsePageSize(value("invitationPageSize"));
  const [memberResult, invitations, projects] = await Promise.all([
    searchOrganizationMembers(memberQuery),
    getPendingInvitations(organization.id, invitationPage, invitationPageSize),
    getOrganizationProjects(organization.id),
  ]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Команда"
          subtitle={`Учасники організації та запрошення · ${organization.name}`}
        />
        <SearchInput key={memberQuery.search} defaultValue={memberQuery.search} label="Пошук учасника" />
        <form action="/dashboard/head/members"><FilterBar>
          {memberQuery.search && <input type="hidden" name="search" value={memberQuery.search} />}
          <input type="hidden" name="pageSize" value={memberQuery.pageSize} />
          {value("tab") && <input type="hidden" name="tab" value={value("tab")} />}
          {value("invitationPage") && <input type="hidden" name="invitationPage" value={value("invitationPage")} />}
          {value("invitationPageSize") && <input type="hidden" name="invitationPageSize" value={value("invitationPageSize")} />}
          <label className="sr-only" htmlFor="member-role">Роль</label><Select id="member-role" name="role" defaultValue={rawRole ?? ""} options={[{ value: "", label: "Усі ролі" }, ...Object.values(UserRole).map((role) => ({ value: role, label: getUserRoleLabel(role) }))]} />
          <label className="sr-only" htmlFor="member-active">Активність</label><Select id="member-active" name="active" defaultValue={active} options={[{ value: "all", label: "Усі учасники" }, { value: "true", label: "Активні" }, { value: "false", label: "Неактивні" }]} />
          <label className="sr-only" htmlFor="member-project">Проєкт</label><Select id="member-project" name="projectId" defaultValue={memberQuery.projectId ?? ""} options={[{ value: "", label: "Усі проєкти" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} />
          <SortSelect value={memberQuery.sortBy} direction={memberQuery.sortDirection} options={[{ value: "createdAt", label: "За датою" }, { value: "name", label: "За ім’ям" }, { value: "role", label: "За роллю" }]} />
          <Button type="submit">Застосувати</Button><Button asChild type="button" variant="secondary"><Link href="/dashboard/head/members">Очистити фільтри</Link></Button>
        </FilterBar></form>
        <div className="flex justify-end"><PageSizeSelect value={memberQuery.pageSize} /></div>
        <TeamManagement
          organizationId={organization.id}
          currentUserId={currentUser.id}
          members={memberResult.items}
          invitations={invitations.items}
          memberTotal={memberResult.pagination.total}
          memberPagination={memberResult.pagination}
          invitationPagination={invitations.pagination}
          projects={projects}
        />
      </div>
    </DashboardLayout>
  );
}
