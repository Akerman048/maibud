import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/app/generated/prisma/client";

function readPositiveInteger(
  name: string,
  fallback: number,
  maximum: number,
) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = new Pool({
    connectionString,
    max: readPositiveInteger("PG_POOL_MAX", 5, 50),
    connectionTimeoutMillis: readPositiveInteger(
      "PG_CONNECTION_TIMEOUT_MS",
      5_000,
      60_000,
    ),
    idleTimeoutMillis: readPositiveInteger(
      "PG_IDLE_TIMEOUT_MS",
      30_000,
      300_000,
    ),
    query_timeout: readPositiveInteger(
      "PG_QUERY_TIMEOUT_MS",
      30_000,
      300_000,
    ),
    statement_timeout: readPositiveInteger(
      "PG_QUERY_TIMEOUT_MS",
      30_000,
      300_000,
    ),
    idle_in_transaction_session_timeout: readPositiveInteger(
      "PG_QUERY_TIMEOUT_MS",
      30_000,
      300_000,
    ),
    application_name: "maibud",
  });

  const adapter = new PrismaPg(pool, {
    disposeExternalPool: true,
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaShutdownRegistered?: boolean;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

if (!globalForPrisma.prismaShutdownRegistered) {
  globalForPrisma.prismaShutdownRegistered = true;

  const shutdown = () => {
    void prisma.$disconnect().finally(() => process.exit(0));
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
