import { prisma } from "@/lib/prisma";
import type { Project, ProjectStatus } from "@/data/mockProjects";

function mapProjectStatus(status: string): ProjectStatus {
  if (status === "OPEN") return "open";
  if (status === "IN_PROGRESS") return "processed";
  if (status === "RETURNED") return "returned";
  if (status === "COMPLETED") return "resolved";
  if (status === "ARCHIVED") return "resolved";

  return "open";
}

export async function getProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    address: project.address,
    customer: project.customer,
    stage: project.stage,
    expert: "Коваль Олег",
    deadline: project.deadline
      ? project.deadline.toLocaleDateString("uk-UA")
      : "—",
    status: mapProjectStatus(project.status),
  }));
}