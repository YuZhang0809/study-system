import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { closeOpenItem, createOpenItem } from "../lib/daily-log/actions";
import { listOpenItems } from "../lib/daily-log/queries";
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
    `tmp-open-items-actions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("open-item actions", () => {
  it("creates a manual open item, closes it, and removes it from the open list", async () => {
    const project = await seedProject("Open Items Project");

    await expect(
      createOpenItem({
        projectId: project.id,
        text: "补上 today 页面测试",
      }),
    ).resolves.toEqual({ ok: true });

    const created = await prisma.openItem.findFirstOrThrow({
      where: { projectId: project.id },
    });
    expect(created).toMatchObject({
      projectId: project.id,
      text: "补上 today 页面测试",
      source: "manual",
      status: "open",
      openedAt: startOfLocalDay(new Date()),
    });

    await expect(closeOpenItem({ id: created.id })).resolves.toEqual({ ok: true });

    const closed = await prisma.openItem.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(closed.status).toBe("done");

    const openItems = await listOpenItems(project.id, prisma);
    expect(openItems.items).toHaveLength(0);
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
