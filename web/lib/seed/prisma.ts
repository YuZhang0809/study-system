import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createAppPrismaClient } from "../prisma";

export function createSeedPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  return createAppPrismaClient(databaseUrl);
}
