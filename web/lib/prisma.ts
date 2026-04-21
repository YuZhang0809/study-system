import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

declare global {
  var __studySystemPrisma__: PrismaClient | undefined;
}

export function createAppPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the app runtime");
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.__studySystemPrisma__) {
    globalThis.__studySystemPrisma__ = createAppPrismaClient();
  }

  return globalThis.__studySystemPrisma__;
}
