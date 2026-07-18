import "dotenv/config";

import { runDevResetCommand } from "../lib/dev-reset-user";

runDevResetCommand({
  args: process.argv.slice(2),
  environment: process.env,
  createPrisma: async () => (await import("../lib/prisma")).prisma,
  output: (value) => console.info(JSON.stringify(value, null, 2)),
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "User reset failed.");
  process.exitCode = 1;
});
