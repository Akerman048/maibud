import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const experts = [
  {
    id: "1",
    name: "Коваль Олег",
    direction: "Газопостачання",
    activeProjects: 3,
    status: "Активний",
  },
  {
    id: "2",
    name: "Мельник Ірина",
    direction: "Вентиляція",
    activeProjects: 2,
    status: "Активний",
  },
  {
    id: "3",
    name: "Шевченко Андрій",
    direction: "Пожежна безпека",
    activeProjects: 4,
    status: "Зайнятий",
  },
];

export default function HeadExpertsPage() {
  return (
    <DashboardLayout role="head">
      <div className="flex flex-col gap-[22px]">
        <Header title="Експерти" subtitle="Команда експертів та їх завантаження" />

        <div className="grid gap-4">
          {experts.map((expert) => (
            <Card key={expert.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{expert.name}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {expert.direction} · {expert.activeProjects} активні проєкти
                  </div>
                </div>

                <Badge variant={expert.status === "Активний" ? "success" : "warning"}>
                  {expert.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}