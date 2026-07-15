import { randomUUID } from "node:crypto";

import type { Prisma } from "@/app/generated/prisma/client";
import { sendEmail } from "@/lib/email/provider-service";
import { getEmailRetryDecision } from "@/lib/email/retry-policy";
import { sanitizeEmailError } from "@/lib/email/safety";
import { renderEmailTemplate } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

const MAX_BATCH_SIZE = 10;
const STALE_LOCK_MS = 15 * 60 * 1000;

type SendEmail = typeof sendEmail;

function asPayload(value: Prisma.JsonValue) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Email job payload must be an object");
  }

  return value as Record<string, unknown>;
}

export async function processEmailJobs({
  batchSize = MAX_BATCH_SIZE,
  send = sendEmail,
}: {
  batchSize?: number;
  send?: SendEmail;
} = {}) {
  const now = new Date();
  const lockedBy = randomUUID();
  const take = Math.max(1, Math.min(batchSize, MAX_BATCH_SIZE));

  await prisma.emailJob.updateMany({
    where: {
      status: "PROCESSING",
      lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) },
    },
    data: {
      status: "FAILED",
      nextAttemptAt: now,
      lockedAt: null,
      lockedBy: null,
      lastError: "Stale processing lock released",
    },
  });

  const candidates = await prisma.emailJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
      lockedAt: null,
    },
    select: { id: true },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take,
  });

  for (const candidate of candidates) {
    await prisma.emailJob.updateMany({
      where: {
        id: candidate.id,
        status: { in: ["PENDING", "FAILED"] },
        nextAttemptAt: { lte: now },
        lockedAt: null,
      },
      data: {
        status: "PROCESSING",
        lockedAt: now,
        lockedBy,
      },
    });
  }

  const jobs = await prisma.emailJob.findMany({
    where: { status: "PROCESSING", lockedBy },
    orderBy: { createdAt: "asc" },
  });
  const summary = { claimed: jobs.length, sent: 0, failed: 0, cancelled: 0 };

  for (const job of jobs) {
    try {
      const rendered = renderEmailTemplate(job.template, asPayload(job.payload));
      const result = await send({
        to: job.recipientEmail,
        subject: job.subject || rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      await prisma.emailJob.updateMany({
        where: { id: job.id, status: "PROCESSING", lockedBy },
        data: {
          status: "SENT",
          attempts: { increment: 1 },
          sentAt: new Date(),
          failedAt: null,
          lastError: null,
          lockedAt: null,
          lockedBy: null,
          providerMessageId: result.providerMessageId,
          payload: { template: job.template, delivered: true },
        },
      });
      summary.sent += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const failedAt = new Date();
      const retry = getEmailRetryDecision({
        attempts,
        maxAttempts: job.maxAttempts,
        now: failedAt,
      });

      await prisma.emailJob.updateMany({
        where: { id: job.id, status: "PROCESSING", lockedBy },
        data: {
          status: retry.cancelled ? "CANCELLED" : "FAILED",
          attempts,
          nextAttemptAt: retry.nextAttemptAt ?? failedAt,
          failedAt,
          lastError: sanitizeEmailError(error),
          lockedAt: null,
          lockedBy: null,
          ...(retry.cancelled
            ? {
                payload: {
                  template: job.template,
                  delivered: false,
                  sanitized: true,
                },
              }
            : {}),
        },
      });

      if (retry.cancelled) {
        summary.cancelled += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return summary;
}
