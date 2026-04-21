import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { createBlocker, resolveBlocker } from "../lib/daily-log/actions";
import { listActiveBlockers } from "../lib/daily-log/queries";
import { createAppPrismaClient } from "../lib/prisma";
import { startOfLocalDay } from "../lib/today/driving-seat";

const { revalidatePath } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");

let dbPath: string;
let prisma: PrismaClient;
let originalDatabaseUrl: string | undefined;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-05T09:00:00.000Z"));

  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-blockers-actions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
  );

  const raw = new Database(dbPath);
  for (const sql of readAllMigrationSql()) {
    raw.exec(sql);
  }
  raw.close();

  originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${dbPath}`;
  globalThis.__studySystemPrisma__ = undefined;
  prisma = createAppPrismaClient(process.env.DATABASE_URL);
  globalThis.__studySystemPrisma__ = prisma;
  revalidatePath.mockReset();
});

afterEach(async () => {
  vi.useRealTimers();

  await prisma.$disconnect();
  globalThis.__studySystemPrisma__ = undefined;

  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
});

describe("blocker actions", () => {
  it("creates a blocker, resolves it, and removes it from the active list", async () => {
    const project = await seedProject("Blockers Project");

    await expect(
      createBlocker({
        projectId: project.id,
        text: "等待 Prisma 连接错误定位",
      }),
    ).resolves.toEqual({ ok: true });

    const created = await prisma.blocker.findFirstOrThrow({
      where: { projectId: project.id },
    });
    expect(created).toMatchObject({
      projectId: project.id,
      text: "等待 Prisma 连接错误定位",
      openedAt: startOfLocalDay(new Date()),
      resolvedAt: null,
    });

    await expect(resolveBlocker({ id: created.id })).resolves.toEqual({ ok: true });

    const resolved = await prisma.blocker.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(resolved.resolvedAt).toBeInstanceOf(Date);

    const blockers = await listActiveBlockers(project.id, prisma);
    expect(blockers.items).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
  });
});

async function seedProject(name: string) {
  return prisma.project.create({
    data: {
      name,
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-07T00:00:00.000Z"),
      hasPlanStructure: "full",
      status: "active",
    },
  });
}

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
