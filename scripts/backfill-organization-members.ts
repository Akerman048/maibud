import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      projects: {
        select: {
          members: {
            select: {
              userId: true,
              user: {
                select: {
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  let usersChecked = 0;
  let membershipsCreated = 0;
  let membershipsSkipped = 0;

  for (const organization of organizations) {
    const users = new Map<
      string,
      (typeof organization.projects)[number]["members"][number]["user"]["role"]
    >();

    for (const project of organization.projects) {
      for (const membership of project.members) {
        users.set(membership.userId, membership.user.role);
      }
    }

    usersChecked += users.size;

    const result = await prisma.organizationMember.createMany({
      data: Array.from(users, ([userId, role]) => ({
        organizationId: organization.id,
        userId,
        role,
      })),
      skipDuplicates: true,
    });

    membershipsCreated += result.count;
    membershipsSkipped += users.size - result.count;
  }

  const usersWithoutOrganizationEvidence = await prisma.user.count({
    where: {
      organizationMemberships: {
        none: {},
      },
      memberships: {
        none: {},
      },
    },
  });

  console.info({
    organizationsChecked: organizations.length,
    usersChecked,
    membershipsCreated,
    membershipsSkipped,
    usersWithoutOrganizationEvidence,
  });
}

main()
  .catch((error) => {
    console.error("Organization membership backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
