import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import {
  CommentThreadStatus,
  EmailJobStatus,
  EmailTemplate,
  NotificationType,
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
  const demoPasswordHash = await hash("Demo1234!", 12);

  await prisma.emailJob.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.commentMessage.deleteMany();
  await prisma.commentThread.deleteMany();
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
      name: "МайБуд Demo",
    },
  });

  const head = await prisma.user.create({
    data: {
      name: "Петренко Сергій",
      email: "serhii.petrenko@example.com",
      role: UserRole.HEAD,
      passwordHash: demoPasswordHash,
    },
  });

  const expert = await prisma.user.create({
    data: {
      name: "Коваль Олег",
      email: "oleh.koval@example.com",
      role: UserRole.EXPERT,
      passwordHash: demoPasswordHash,
    },
  });

  const designer = await prisma.user.create({
    data: {
      name: "Романенко Павло",
      email: "pavlo.romanenko@example.com",
      role: UserRole.DESIGNER,
      passwordHash: demoPasswordHash,
    },
  });

  const archivist = await prisma.user.create({
    data: {
      name: "Іванов Дмитро",
      email: "dmytro.ivanov@example.com",
      role: UserRole.ARCHIVIST,
      passwordHash: demoPasswordHash,
    },
  });

  const client = await prisma.user.create({
    data: {
      name: "Іваненко Андрій",
      email: "andrii.ivanenko@example.com",
      role: UserRole.CLIENT,
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.organizationMember.createMany({
    data: [head, expert, designer, archivist, client].map((user) => ({
      organizationId: organization.id,
      userId: user.id,
      role: user.role,
    })),
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
        status: ProjectStatus.ARCHIVED,
        previousStatus: ProjectStatus.COMPLETED,
        archivedAt: new Date("2026-07-01T09:00:00.000Z"),
        archivedById: archivist.id,
        archiveReason: "Демонстраційний завершений проєкт",
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

const archivedDocument = await prisma.document.create({
  data: {
    title: "Архівний погоджений висновок.pdf",
    status: "ARCHIVED",
    previousStatus: "APPROVED",
    archivedAt: new Date("2026-07-02T10:00:00.000Z"),
    archivedById: head.id,
    archiveReason: "Замінено актуальною редакцією",
    projectId: projects[1].id,
    authorId: designer.id,
  },
});

const restoredDocument = await prisma.document.create({
  data: {
    title: "Відновлений розділ конструкцій.pdf",
    status: "REJECTED",
    archivedAt: new Date("2026-06-30T10:00:00.000Z"),
    archivedById: archivist.id,
    archiveReason: "Тимчасово вилучено для перевірки",
    restoredAt: new Date("2026-07-03T10:00:00.000Z"),
    restoredById: archivist.id,
    projectId: projects[1].id,
    authorId: designer.id,
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

const demoThread = await prisma.commentThread.create({
  data: {
    title: "Уточнення схеми підключення",
    section: "Зовнішні мережі",
    status: CommentThreadStatus.OPEN,
    documentId: document1.id,
    createdById: expert.id,
    messages: {
      create: [
        {
          authorId: expert.id,
          content: "Уточніть точку підключення до зовнішньої мережі.",
        },
        {
          authorId: designer.id,
          content: "Схему перевіряємо, додамо позначення у наступній версії.",
        },
        {
          authorId: expert.id,
          content: "Додайте також посилання на технічні умови.",
        },
      ],
    },
  },
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

  await prisma.projectMember.create({
    data: {
      userId: client.id,
      projectId: projects[0].id,
      role: UserRole.CLIENT,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: expert.id,
        actorId: designer.id,
        type: NotificationType.DOCUMENT_SUBMITTED,
        title: "Новий документ на перевірку",
        message: `Дизайнер подав документ «${document1.title}» на перевірку.`,
        href: `/dashboard/expert/projects/${projects[0].id}`,
        projectId: projects[0].id,
        documentId: document1.id,
      },
      {
        userId: designer.id,
        actorId: expert.id,
        type: NotificationType.COMMENT_THREAD_CREATED,
        title: "Нове зауваження до документа",
        message: `Експерт створив зауваження до документа «${document1.title}».`,
        href: `/dashboard/designer/comments/${demoThread.id}`,
        projectId: projects[0].id,
        documentId: document1.id,
        commentThreadId: demoThread.id,
      },
      {
        userId: client.id,
        actorId: head.id,
        type: NotificationType.DOCUMENT_PUBLISHED,
        title: "Опубліковано документ",
        message: `Для вас опубліковано документ «${document1.title}».`,
        href: `/dashboard/client/projects/${projects[0].id}`,
        projectId: projects[0].id,
        documentId: document1.id,
        readAt: new Date(),
      },
      {
        userId: head.id,
        actorId: designer.id,
        type: NotificationType.PROJECT_MEMBER_ADDED,
        title: "Користувача додано до проєкту",
        message: `${designer.name} має доступ до проєкту «${projects[0].name}».`,
        href: `/dashboard/head/projects/${projects[0].id}`,
        projectId: projects[0].id,
      },
      {
        userId: designer.id,
        actorId: archivist.id,
        type: NotificationType.PROJECT_ARCHIVED,
        title: "Проєкт архівовано",
        message: `Проєкт «${projects[2].name}» переміщено в архів.`,
        href: `/dashboard/designer/archive/${projects[2].id}`,
        projectId: projects[2].id,
      },
      {
        userId: designer.id,
        actorId: archivist.id,
        type: NotificationType.DOCUMENT_RESTORED,
        title: "Документ відновлено",
        message: `Документ «${restoredDocument.title}» відновлено з архіву.`,
        href: `/dashboard/designer/projects/${projects[1].id}`,
        projectId: projects[1].id,
        documentId: restoredDocument.id,
      },
      {
        userId: designer.id,
        actorId: head.id,
        type: NotificationType.DOCUMENT_ARCHIVED,
        title: "Документ архівовано",
        message: `Документ «${archivedDocument.title}» переміщено в архів.`,
        href: `/dashboard/designer/archive/${projects[1].id}`,
        projectId: projects[1].id,
        documentId: archivedDocument.id,
      },
    ],
  });

  await prisma.emailJob.createMany({
    data: [
      {
        template: EmailTemplate.DOCUMENT_SUBMITTED,
        status: EmailJobStatus.SENT,
        recipientEmail: expert.email,
        recipientName: expert.name,
        subject: "Документ подано на перевірку",
        payload: { template: "DOCUMENT_SUBMITTED", delivered: true },
        attempts: 1,
        sentAt: new Date(),
        providerMessageId: "demo-message-sent",
      },
      {
        template: EmailTemplate.COMMENT_THREAD_CREATED,
        status: EmailJobStatus.PENDING,
        recipientEmail: designer.email,
        recipientName: designer.name,
        subject: "Нове зауваження до документа",
        payload: {
          recipientName: designer.name,
          message: "До документа додано нове зауваження.",
          href: `/dashboard/designer/comments/${demoThread.id}`,
        },
      },
      {
        template: EmailTemplate.DOCUMENT_PUBLISHED,
        status: EmailJobStatus.FAILED,
        recipientEmail: client.email,
        recipientName: client.name,
        subject: "Документ опубліковано",
        payload: {
          recipientName: client.name,
          message: "Для вас опубліковано документ.",
          href: `/dashboard/client/projects/${projects[0].id}`,
        },
        attempts: 1,
        failedAt: new Date(),
        lastError: "Demo provider failure",
      },
      {
        template: EmailTemplate.PROJECT_ARCHIVED,
        status: EmailJobStatus.PENDING,
        recipientEmail: designer.email,
        recipientName: designer.name,
        subject: "Проєкт архівовано",
        payload: {
          recipientName: designer.name,
          message: `Проєкт «${projects[2].name}» переміщено в архів.`,
          href: `/dashboard/designer/archive/${projects[2].id}`,
        },
      },
      {
        template: EmailTemplate.DOCUMENT_RESTORED,
        status: EmailJobStatus.PENDING,
        recipientEmail: designer.email,
        recipientName: designer.name,
        subject: "Документ відновлено",
        payload: {
          recipientName: designer.name,
          message: `Документ «${restoredDocument.title}» відновлено з архіву.`,
          href: `/dashboard/designer/projects/${projects[1].id}`,
        },
      },
    ],
  });

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
