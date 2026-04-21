import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { carryForwardYesterdayPromise } from "../lib/daily-log/actions";
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
    `tmp-daily-log-carry-forward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("carryForwardYesterdayPromise", () => {
  it("creates one daily-log open item and de-dupes on the second click", async () => {
    const project = await seedProject("Carry Forward Project");
    await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-04T00:00:00.000Z"),
        whatDone: ["搭壳"],
        whatSkipped: [],
        timeSpentMinutes: 90,
        tomorrowFirstThing: "写完 retro plan",
        honestyNote: null,
      },
    });

    await expect(carryForwardYesterdayPromise({ projectId: project.id })).resolves.toEqual({ ok: true });
    await expect(carryForwardYesterdayPromise({ projectId: project.id })).resolves.toEqual({
      ok: true,
      deduped: true,
    });

    const openItems = await prisma.openItem.findMany({
      where: { projectId: project.id },
    });

    expect(openItems).toHaveLength(1);
    expect(openItems[0]).toMatchObject({
      projectId: project.id,
      text: "写完 retro plan",
      source: "daily_log",
      status: "open",
      openedAt: startOfLocalDay(new Date()),
    });

    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
  });

  it("is a no-op when yesterday left no carry-forward text", async () => {
    const project = await seedProject("Empty Promise Project");
    await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-04T00:00:00.000Z"),
        whatDone: [],
        whatSkipped: [],
        timeSpentMinutes: 30,
        tomorrowFirstThing: "   ",
        honestyNote: null,
      },
    });

    await expect(carryForwardYesterdayPromise({ projectId: project.id })).resolves.toEqual({ ok: true });
    expect(await prisma.openItem.count()).toBe(0);
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
