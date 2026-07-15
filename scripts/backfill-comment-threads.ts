import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const legacyComments = await prisma.comment.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      content: true,
      status: true,
      documentId: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const comment of legacyComments) {
    const existingThread = await prisma.commentThread.findUnique({
      where: { legacyCommentId: comment.id },
      select: { id: true },
    });

    if (existingThread) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const thread = await tx.commentThread.create({
        data: {
          legacyCommentId: comment.id,
          documentId: comment.documentId,
          createdById: comment.authorId,
          status: comment.status,
          resolvedAt:
            comment.status === "RESOLVED" ? comment.updatedAt : null,
          returnedAt:
            comment.status === "RETURNED" ? comment.updatedAt : null,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        },
        select: { id: true },
      });

      await tx.commentMessage.create({
        data: {
          threadId: thread.id,
          authorId: comment.authorId,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        },
      });
    });

    created += 1;
  }

  console.info({
    legacyCommentsChecked: legacyComments.length,
    threadsCreated: created,
    existingThreadsSkipped: skipped,
  });
}

main()
  .catch((error) => {
    console.error("Comment thread backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
