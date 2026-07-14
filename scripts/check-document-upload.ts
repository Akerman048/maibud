import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const version = await prisma.documentVersion.findFirst({
    where: {
      objectKey: process.argv[2],
    },
    include: {
      document: true,
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  console.dir(version, {
    depth: null,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });