import { UserRole } from "@/app/generated/prisma/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { TeamManagement } from "@/components/organization/TeamManagement";
import { Card } from "@/components/ui/Card";
import {
  getCurrentHeadOrganization,
  getOrganizationMembers,
  getOrganizationProjects,
  getPendingInvitations,
} from "@/lib/organization-members";
import { requireDashboardRole } from "@/lib/require-dashboard-role";

export default async function HeadMembersPage() {
  const currentUser = await requireDashboardRole(UserRole.HEAD);
  const organization = await getCurrentHeadOrganization(currentUser.id);

  if (!organization) {
    return (
      <DashboardLayout>
        <Card className="p-8">
          <h1 className="text-xl font-bold">Немає доступної організації</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Для керування командою потрібне активне membership із роллю HEAD.
          </p>
        </Card>
      </DashboardLayout>
    );
  }

  const [members, invitations, projects] = await Promise.all([
    getOrganizationMembers(organization.id),
    getPendingInvitations(organization.id),
    getOrganizationProjects(organization.id),
  ]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header
          title="Команда"
          subtitle={`Учасники організації та запрошення · ${organization.name}`}
        />
        <TeamManagement
          organizationId={organization.id}
          currentUserId={currentUser.id}
          members={members}
          invitations={invitations}
          projects={projects}
        />
      </div>
    </DashboardLayout>
  );
}
