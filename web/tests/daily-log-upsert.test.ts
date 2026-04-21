import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { createAppPrismaClient } from "../lib/prisma";
import { upsertDailyLog } from "../lib/daily-log/actions";

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
  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-daily-log-upsert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("upsertDailyLog", () => {
  it("creates a daily log row and updates the same row on the second submit", async () => {
    const project = await seedProject("Daily Log Upsert Project");

    await expect(
      upsertDailyLog(
        buildFormData({
          projectId: project.id,
          date: "2026-05-05",
          whatDone: ["写 action", "补测试"],
          whatSkipped: ["清理样式"],
          timeSpentMinutes: "135",
          tomorrowFirstThing: "把页面接上",
          honestyNote: "今天绕了远路。",
        }),
      ),
    ).resolves.toEqual({ ok: true });

    await expect(
      upsertDailyLog(
        buildFormData({
          projectId: project.id,
          date: "2026-05-05",
          whatDone: ["写 action"],
          whatSkipped: [],
          timeSpentMinutes: "150",
          tomorrowFirstThing: "把测试补全",
          honestyNote: "",
        }),
      ),
    ).resolves.toEqual({ ok: true });

    const logs = await prisma.dailyLog.findMany({
      where: { projectId: project.id },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      projectId: project.id,
      timeSpentMinutes: 150,
      tomorrowFirstThing: "把测试补全",
      honestyNote: null,
    });
    expect(logs[0].whatDone).toEqual(["写 action"]);
    expect(logs[0].whatSkipped).toEqual([]);

    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith("/today");
  });

  it("returns field errors instead of writing invalid input", async () => {
    const result = await upsertDailyLog(
      buildFormData({
        projectId: "",
        date: "2026-05-05",
        whatDone: ["有效项"],
        whatSkipped: [],
        timeSpentMinutes: "-15",
        tomorrowFirstThing: " ",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.projectId).toBeTruthy();
    expect(result.fieldErrors?.timeSpentMinutes).toBeTruthy();
    expect(result.fieldErrors?.tomorrowFirstThing).toBeTruthy();
    expect(await prisma.dailyLog.count()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

function buildFormData(input: {
  projectId: string;
  date: string;
  whatDone: string[];
  whatSkipped: string[];
  timeSpentMinutes: string;
  tomorrowFirstThing: string;
  honestyNote?: string;
}): FormData {
  const formData = new FormData();
  formData.set("projectId", input.projectId);
  formData.set("date", input.date);
  formData.set("timeSpentMinutes", input.timeSpentMinutes);
  formData.set("tomorrowFirstThing", input.tomorrowFirstThing);

  if (input.honestyNote !== undefined) {
    formData.set("honestyNote", input.honestyNote);
  }

  for (const value of input.whatDone) {
    formData.append("whatDone", value);
  }

  for (const value of input.whatSkipped) {
    formData.append("whatSkipped", value);
  }

  return formData;
}

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
