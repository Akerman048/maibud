import { notFound } from "next/navigation";

import { ProjectPublicDocuments } from "@/components/projects/ProjectPublicDocuments";

import { mockProjects } from "@/data/mockProjects";
import { ProjectStepper } from "@/components/projects/ProjectStepper";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ProjectInfoGrid } from "@/components/projects/ProjectInfoGrid";
import { Card } from "@/components/ui/Card";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const project = mockProjects.find((project) => project.id === id);

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-[7px] bg-[var(--color-accent)] text-sm font-bold text-white">
            E
          </div>

          <span className="text-[15px] font-bold">ExpertDesk</span>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">
            Статус експертизи вашого проєкту
          </div>

          <h1 className="text-3xl font-bold tracking-[-0.01em]">
            {project.name}
          </h1>

          <p className="mt-1 text-[var(--color-text-secondary)]">
            {project.address}
          </p>
        </div>

        <Card className="p-8">
          <ProjectStepper currentStep={3} />
        </Card>

        <Card className="p-6">
          <ProjectInfoGrid project={project} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-lg font-semibold">Останні оновлення</h2>

          <ProjectTimeline />
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-lg font-semibold">Документи</h2>
          <ProjectPublicDocuments />
        </Card>
      </div>
    </main>
  );
}
