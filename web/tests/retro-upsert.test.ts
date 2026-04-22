import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { createAppPrismaClient } from "../lib/prisma";
import { upsertRetro } from "../lib/retro/actions";

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
    `tmp-retro-upsert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("upsertRetro", () => {
  it("creates a retro row with the full committed payload", async () => {
    const segment = await seedSegment("Retro Create Project");

    await expect(upsertRetro(buildRetroInput(segment.id))).resolves.toEqual({ ok: true });

    const rows = await prisma.retro.findMany({
      where: { segmentId: segment.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].metrics).toMatchObject(buildMetrics());
    expect(rows[0].selfScores).toMatchObject(buildScores());
    expect(rows[0].threeQuestions).toMatchObject(buildQuestions());
    expect(rows[0].scopeChanges).toMatchObject(buildScopeChanges());
    expect(rows[0].nextPhaseFirstThing).toBe("先跑 baseline");
    expect(revalidatePath).toHaveBeenCalledWith("/retros");
  });

  it("updates the same retro row on a second submit while keeping createdAt stable", async () => {
    const segment = await seedSegment("Retro Update Project");

    await upsertRetro(buildRetroInput(segment.id));

    const firstRow = await prisma.retro.findUniqueOrThrow({
      where: { segmentId: segment.id },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await upsertRetro(
      buildRetroInput(segment.id, {
        selfScores: buildScores({ clarity: 4 }),
        threeQuestions: buildQuestions({
          q2: "第二次提交 · 这次承认自己当时并没搞懂缓存边界。",
        }),
        nextPhaseFirstThing: "先补回归测试",
      }),
    );

    const rows = await prisma.retro.findMany({
      where: { segmentId: segment.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(firstRow.id);
    expect(rows[0].createdAt.getTime()).toBe(firstRow.createdAt.getTime());
    expect(rows[0].updatedAt.getTime()).toBeGreaterThan(firstRow.updatedAt.getTime());
    expect(rows[0].selfScores).toMatchObject({ clarity: 4 });
    expect(rows[0].threeQuestions).toMatchObject({
      q2: "第二次提交 · 这次承认自己当时并没搞懂缓存边界。",
    });
    expect(rows[0].nextPhaseFirstThing).toBe("先补回归测试");
  });

  it("returns field errors when nextPhaseFirstThing is missing", async () => {
    const segment = await seedSegment("Retro Missing Hook Project");

    const result = await upsertRetro(
      buildRetroInput(segment.id, {
        nextPhaseFirstThing: "   ",
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.nextPhaseFirstThing).toEqual(["这条必填,不然下一阶段就没有钩子"]);
    expect(await prisma.retro.count()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a nested question field error for whitespace-only q2", async () => {
    const segment = await seedSegment("Retro Question Validation Project");

    const result = await upsertRetro(
      buildRetroInput(segment.id, {
        threeQuestions: buildQuestions({
          q2: "   ",
        }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.threeQuestions?.q2).toEqual(["这一题不填,就写『没有』或『跳过』,但别空着"]);
    expect(await prisma.retro.count()).toBe(0);
  });

  it("rejects a score outside the 1..5 range", async () => {
    const segment = await seedSegment("Retro Score Validation Project");

    const result = await upsertRetro(
      buildRetroInput(segment.id, {
        selfScores: buildScores({
          clarity: 7,
        }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.selfScores?.clarity).toEqual(["分值必须在 1 到 5 之间"]);
    expect(await prisma.retro.count()).toBe(0);
  });

  it("accepts an empty scopeChanges array", async () => {
    const segment = await seedSegment("Retro Empty Scope Project");

    await expect(
      upsertRetro(
        buildRetroInput(segment.id, {
          scopeChanges: [],
        }),
      ),
    ).resolves.toEqual({ ok: true });

    const row = await prisma.retro.findUniqueOrThrow({
      where: { segmentId: segment.id },
    });

    expect(row.scopeChanges).toEqual([]);
  });

  it("rejects a half-filled scope change row", async () => {
    const segment = await seedSegment("Retro Scope Validation Project");

    const result = await upsertRetro(
      buildRetroInput(segment.id, {
        scopeChanges: [
          {
            change: "砍掉环境折腾",
            reason: "",
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.fieldErrors.scopeChanges?.[0]?.reason).toEqual(["这一条没填完,要么删了要么补齐"]);
    expect(await prisma.retro.count()).toBe(0);
  });
});

async function seedSegment(projectName: string) {
  const project = await prisma.project.create({
    data: {
      name: projectName,
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-31T00:00:00.000Z"),
      hasPlanStructure: "full",
      status: "active",
    },
  });

  return prisma.planSegment.create({
    data: {
      projectId: project.id,
      order: 1,
      name: "Phase 1 - Foundations",
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-10T00:00:00.000Z"),
      goals: [],
    },
  });
}

function buildRetroInput(
  segmentId: string,
  overrides: Partial<{
    metrics: ReturnType<typeof buildMetrics>;
    selfScores: ReturnType<typeof buildScores>;
    threeQuestions: ReturnType<typeof buildQuestions>;
    scopeChanges: ReturnType<typeof buildScopeChanges>;
    nextPhaseFirstThing: string;
  }> = {},
) {
  return {
    segmentId,
    metrics: overrides.metrics ?? buildMetrics(),
    selfScores: overrides.selfScores ?? buildScores(),
    threeQuestions: overrides.threeQuestions ?? buildQuestions(),
    scopeChanges: overrides.scopeChanges ?? buildScopeChanges(),
    nextPhaseFirstThing: overrides.nextPhaseFirstThing ?? "先跑 baseline",
  };
}

function buildMetrics(
  overrides: Partial<{
    commits: number;
    logs: number;
    learnings: number;
    bugs: number;
    prompts: number;
    planned_days: number;
    drift_days: number;
  }> = {},
) {
  return {
    commits: 2,
    logs: 5,
    learnings: 3,
    bugs: 1,
    prompts: 4,
    planned_days: 7,
    drift_days: 2,
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

function buildQuestions(
  overrides: Partial<{
    q1: string;
    q2: string;
    q3: string;
  }> = {},
) {
  return {
    q1: "真正搞懂了先跑最小复现再谈判断。",
    q2: "当时骗自己搞懂了缓存边界。",
    q3: "重来会先砍掉环境折腾。",
    ...overrides,
  };
}

function buildScopeChanges(
  overrides: Partial<{
    change: string;
    reason: string;
  }> = {},
) {
  return [
    {
      change: "砍掉环境折腾",
      reason: "ROI 太低",
      ...overrides,
    },
  ];
}

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
