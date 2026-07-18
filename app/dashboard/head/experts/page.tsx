import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireCurrentHeadOrganization } from "@/lib/organization-access";
import { getOrganizationExperts } from "@/lib/projects";

export default async function HeadExpertsPage() {
  const { organization } = await requireCurrentHeadOrganization();
  const experts = await getOrganizationExperts(organization.id);
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-[22px]">
        <Header title="Експерти" subtitle="Команда експертів та їх завантаження" />

        {experts.length === 0 ? (
          <Card className="p-5 text-sm text-[var(--color-text-secondary)]">
            В організації ще немає експертів.
          </Card>
        ) : (
          <div className="grid gap-4">
            {experts.map((expert) => (
              <Card key={expert.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{expert.name}</div>
                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {expert.activeProjects} активні проєкти
                    </div>
                  </div>

                  <Badge
                    variant={expert.status === "active" ? "success" : "warning"}
                  >
                    {expert.status === "active" ? "Активний" : "Зайнятий"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
