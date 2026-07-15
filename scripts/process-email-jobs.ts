import "dotenv/config";

import { processEmailJobs } from "../lib/email/email-worker-service";
import { assertEmailProviderConfigured } from "../lib/email/provider-service";
import { getValidatedAppUrl } from "../lib/email/templates";
import { prisma } from "../lib/prisma";

async function main() {
  assertEmailProviderConfigured();
  getValidatedAppUrl();
  const summary = await processEmailJobs({ batchSize: 10 });
  console.log(summary);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Email worker failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
