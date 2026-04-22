import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { computeRetroMetrics } from "../lib/retro/metrics";
import { createAppPrismaClient } from "../lib/prisma";

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");

let dbPath: string;
let prisma: PrismaClient;
let originalDatabaseUrl: string | undefined;

beforeEach(async () => {
  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-retro-metrics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("computeRetroMetrics", () => {
  it("aggregates the seven retro metrics from the segment window", async () => {
    const { project, segment } = await seedProjectWithSegment("Retro Metrics Project");

    await Promise.all([
      seedPlanDay(project.id, segment.id, "2026-05-10", "Day 1"),
      seedPlanDay(project.id, segment.id, "2026-05-11", "Day 2"),
      seedDailyLog(project.id, "2026-05-10"),
      seedDailyLog(project.id, "2026-05-12"),
      seedDailyLog(project.id, "2026-05-13"),
    ]);

    const learning = await seedKnowledgeItem(project.id, "learning", "2026-05-10T10:00:00.000Z", "learning-in-window");
    const bug = await seedKnowledgeItem(project.id, "bug", "2026-05-11T10:00:00.000Z", "bug-in-window");
    const prompt = await seedKnowledgeItem(project.id, "prompt", "2026-05-12T10:00:00.000Z", "prompt-in-window");
    const outsideLearning = await seedKnowledgeItem(project.id, "learning", "2026-05-13T10:00:00.000Z", "learning-outside-window");

    await Promise.all([
      seedArtifact("knowledge_item", learning.id, "commit", "commit-learning"),
      seedArtifact("knowledge_item", bug.id, "commit", "commit-bug"),
      seedArtifact("knowledge_item", prompt.id, "screenshot", "not-a-commit"),
      seedArtifact("knowledge_item", outsideLearning.id, "commit", "commit-outside-window"),
      seedArtifact("daily_log", learning.id, "commit", "wrong-owner-type"),
    ]);

    const metrics = await computeRetroMetrics(project.id, segment, prisma);

    expect(metrics).toEqual({
      commits: 2,
      logs: 2,
      learnings: 1,
      bugs: 1,
      prompts: 1,
      planned_days: 2,
      drift_days: 1,
    });
  });

  it("returns zero commits when no knowledge items fall in the segment window", async () => {
    const { project, segment } = await seedProjectWithSegment("Retro Metrics Empty Project");

    await seedArtifact("knowledge_item", "missing-knowledge-id", "commit", "dangling-commit");

    const metrics = await computeRetroMetrics(project.id, segment, prisma);

    expect(metrics.commits).toBe(0);
    expect(metrics.learnings).toBe(0);
    expect(metrics.bugs).toBe(0);
    expect(metrics.prompts).toBe(0);
  });
});

async function seedProjectWithSegment(name: string) {
  const project = await prisma.project.create({
    data: {
      name,
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-31T00:00:00.000Z"),
      hasPlanStructure: "full",
      status: "active",
    },
  });

  const segment = await prisma.planSegment.create({
    data: {
      projectId: project.id,
      order: 1,
      name: "Phase 1 - Foundations",
      startDate: new Date("2026-05-10T00:00:00.000Z"),
      endDate: new Date("2026-05-12T00:00:00.000Z"),
      goals: [],
    },
  });

  return { project, segment };
}

async function seedPlanDay(projectId: string, segmentId: string, date: string, title: string) {
  return prisma.planDay.create({
    data: {
      projectId,
      segmentId,
      date: new Date(`${date}T00:00:00.000Z`),
      title,
      plannedTasks: [],
    },
  });
}

async function seedDailyLog(projectId: string, date: string) {
  return prisma.dailyLog.create({
    data: {
      projectId,
      date: new Date(`${date}T00:00:00.000Z`),
      whatDone: ["写代码"],
      whatSkipped: [],
      timeSpentMinutes: 90,
      tomorrowFirstThing: "继续跑 smoke",
    },
  });
}

async function seedKnowledgeItem(projectId: string, type: string, createdAt: string, slug: string) {
  return prisma.knowledgeItem.create({
    data: {
      projectId,
      type,
      title: slug,
      slug,
      bodyMd: `# ${slug}`,
      tags: [],
      metadata: {},
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    },
  });
}

async function seedArtifact(ownerType: string, ownerId: string, kind: string, urlOrPath: string) {
  return prisma.artifact.create({
    data: {
      ownerType,
      ownerId,
      kind,
      urlOrPath,
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
