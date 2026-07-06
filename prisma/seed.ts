import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  ProjectStatus,
  UserRole,
} from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.comment.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const organization = await prisma.organization.create({
    data: {
      name: "ExpertDesk Demo",
    },
  });

  const head = await prisma.user.create({
    data: {
      name: "Петренко Сергій",
      email: "serhii.petrenko@example.com",
      role: UserRole.HEAD,
    },
  });

  const expert = await prisma.user.create({
    data: {
      name: "Коваль Олег",
      email: "oleh.koval@example.com",
      role: UserRole.EXPERT,
    },
  });

  const designer = await prisma.user.create({
    data: {
      name: "Романенко Павло",
      email: "pavlo.romanenko@example.com",
      role: UserRole.DESIGNER,
    },
  });

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "ЖК «Подільські вежі»",
        address: "вул. Кирилівська, 41, м. Київ",
        customer: "ТОВ «Поділ Девелопмент»",
        stage: "Експертиза",
        status: ProjectStatus.OPEN,
        deadline: new Date("2026-07-08"),
        organizationId: organization.id,
      },
    }),
    prisma.project.create({
      data: {
        name: "БЦ «Либідь Плаза»",
        address: "просп. Науки, 12, м. Київ",
        customer: "ТОВ «Либідь Інвест»",
        stage: "Зауваження",
        status: ProjectStatus.RETURNED,
        deadline: new Date("2026-07-04"),
        organizationId: organization.id,
      },
    }),
    prisma.project.create({
      data: {
        name: "ТРЦ «Дніпро Молл»",
        address: "вул. Набережна, 18, м. Дніпро",
        customer: "ТОВ «Дніпро Рітейл»",
        stage: "Завершено",
        status: ProjectStatus.COMPLETED,
        deadline: new Date("2026-06-28"),
        organizationId: organization.id,
      },
    }),
  ]);

const document1 = await prisma.document.create({
  data: {
    title: "Проєктна документація.pdf",
    status: "SUBMITTED",
    projectId: projects[0].id,
    authorId: designer.id,
  },
});

const document2 = await prisma.document.create({
  data: {
    title: "Розділ газопостачання.dwg",
    status: "SUBMITTED",
    projectId: projects[0].id,
    authorId: designer.id,
  },
});

await prisma.document.create({
  data: {
    title: "Експертний висновок.docx",
    status: "APPROVED",
    projectId: projects[1].id,
    authorId: expert.id,
  },
});

await prisma.comment.createMany({
  data: [
    {
      content: "Необхідно уточнити схему підключення до зовнішньої мережі.",
      documentId: document1.id,
      authorId: expert.id,
    },
    {
      content: "Потрібно оновити розрахунок повітрообміну.",
      documentId: document2.id,
      authorId: expert.id,
    },
  ],
});

  for (const project of projects) {
    await prisma.projectMember.createMany({
      data: [
        {
          userId: head.id,
          projectId: project.id,
          role: UserRole.HEAD,
        },
        {
          userId: expert.id,
          projectId: project.id,
          role: UserRole.EXPERT,
        },
        {
          userId: designer.id,
          projectId: project.id,
          role: UserRole.DESIGNER,
        },
      ],
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });