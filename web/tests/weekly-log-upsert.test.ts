import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { createAppPrismaClient } from "../lib/prisma";
import { upsertWeeklyLog } from "../lib/weekly-log/actions";

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
    `tmp-weekly-log-upsert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("upsertWeeklyLog", () => {
  it("creates a new row when none exists for the project-week pair", async () => {
    const project = await seedProject("Weekly Upsert Project");

    await expect(
      upsertWeeklyLog({
        projectId: project.id,
        weekStart: "2026-05-11",
        reflections: buildReflections(),
        selfScores: buildScores(),
      }),
    ).resolves.toEqual({ ok: true });

    const rows = await prisma.weeklyLog.findMany({
      where: { projectId: project.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].weekStart.toISOString()).toBe("2026-05-11T00:00:00.000Z");
    expect(rows[0].reflections).toMatchObject(buildReflections());
    expect(rows[0].selfScores).toMatchObject(buildScores());
    expect(revalidatePath).toHaveBeenCalledWith("/retros");
  });

  it("overwrites the same row on the second submit while keeping createdAt stable", async () => {
    const project = await seedProject("Weekly Update Project");

    await upsertWeeklyLog({
      projectId: project.id,
      weekStart: "2026-05-11",
      reflections: buildReflections(),
      selfScores: buildScores(),
    });

    const firstRow = await prisma.weeklyLog.findFirstOrThrow({
      where: { projectId: project.id },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await upsertWeeklyLog({
      projectId: project.id,
      weekStart: "2026-05-11",
      reflections: buildReflections({
        q3: "第二次提交 · 改成了更诚实的版本。",
      }),
      selfScores: buildScores({
        clarity: 4,
      }),
    });

    const rows = await prisma.weeklyLog.findMany({
      where: { projectId: project.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(firstRow.id);
    expect(rows[0].createdAt.getTime()).toBe(firstRow.createdAt.getTime());
    expect(rows[0].updatedAt.getTime()).toBeGreaterThan(firstRow.updatedAt.getTime());
    expect(rows[0].reflections).toMatchObject({
      q3: "第二次提交 · 改成了更诚实的版本。",
    });
    expect(rows[0].selfScores).toMatchObject({
      clarity: 4,
    });
  });

  it("returns field errors when weekStart is missing", async () => {
    const project = await seedProject("Weekly Missing Date Project");
    const input = {
      projectId: project.id,
      reflections: buildReflections(),
      selfScores: buildScores(),
    } as unknown as Parameters<typeof upsertWeeklyLog>[0];

    const result = await upsertWeeklyLog(input);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.weekStart).toBeTruthy();
    expect(await prisma.weeklyLog.count()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a nested reflection field error for whitespace-only q3", async () => {
    const project = await seedProject("Weekly Reflection Validation Project");

    const result = await upsertWeeklyLog({
      projectId: project.id,
      weekStart: "2026-05-11",
      reflections: buildReflections({
        q3: "   ",
      }),
      selfScores: buildScores(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.reflections?.q3).toEqual(["这一题不填,就写『没有』或『跳过本周』,但别空着"]);
    expect(await prisma.weeklyLog.count()).toBe(0);
  });

  it("rejects a score outside the 1..5 range", async () => {
    const project = await seedProject("Weekly Score Validation Project");

    const result = await upsertWeeklyLog({
      projectId: project.id,
      weekStart: "2026-05-11",
      reflections: buildReflections(),
      selfScores: buildScores({
        clarity: 6,
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.selfScores?.clarity).toEqual(["分值必须在 1 到 5 之间"]);
    expect(await prisma.weeklyLog.count()).toBe(0);
  });
});

function buildReflections(
  overrides: Partial<{
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
  }> = {},
) {
  return {
    q1: "本周最重要的学到是先把证据拉出来。",
    q2: "最浪费时间的是没有先跑最小复现。",
    q3: "偏离了两天,因为我一直躲着 benchmark。",
    q4: "只兑现了一半。",
    q5: "新开了两个 open_item。",
    q6: "周一 09:00 先跑 baseline。",
    ...overrides,
  };
}

function buildScores(
  overrides: Partial<{
    clarity: number;
    honesty: number;
    output: number;
    depth: number;
    discipline: number;
    energy: number;
  }> = {},
) {
  return {
    clarity: 3,
    honesty: 4,
    output: 3,
    depth: 4,
    discipline: 3,
    energy: 2,
    ...overrides,
  };
}

async function seedProject(name: string) {
  return prisma.project.create({
    data: {
      name,
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-31T00:00:00.000Z"),
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
