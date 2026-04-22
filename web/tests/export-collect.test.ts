import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { PrismaClient } from "@prisma/client";
import { collectExportData } from "../lib/export/collect";
import { EXPORT_TABLE_KEYS } from "../lib/export/shape";
import { createAppPrismaClient } from "../lib/prisma";

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");

let dbPath = "";
let prisma: PrismaClient;

beforeEach(async () => {
  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-export-collect-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
  );

  const raw = new Database(dbPath);

  try {
    for (const sql of readAllMigrationSql()) {
      raw.exec(sql);
    }

    raw.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
      )
    `);

    raw
      .prepare(
        `
          INSERT INTO _prisma_migrations (
            id,
            checksum,
            finished_at,
            migration_name,
            logs,
            rolled_back_at,
            started_at,
            applied_steps_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        "migration-1",
        "checksum-1",
        "2026-04-22T11:04:20.300Z",
        "20260421150000_export_collect_test",
        null,
        null,
        "2026-04-22T11:04:20.200Z",
        1,
      );
  } finally {
    raw.close();
  }

  prisma = createAppPrismaClient(`file:${dbPath}`);
});

afterEach(async () => {
  await prisma.$disconnect();

  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
});

describe("collectExportData", () => {
  it("returns only the exported tables in the locked key order with rows sorted by id", async () => {
    const project = await prisma.project.create({
      data: {
        id: "project-1",
        name: "Export Test Project",
        startDate: new Date("2026-05-03T00:00:00.000Z"),
        endDate: new Date("2026-05-31T00:00:00.000Z"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    const segmentA = await prisma.planSegment.create({
      data: {
        id: "segment-a",
        projectId: project.id,
        order: 1,
        name: "Phase A",
        startDate: new Date("2026-05-03T00:00:00.000Z"),
        endDate: new Date("2026-05-10T00:00:00.000Z"),
        goals: ["keep evidence"],
      },
    });
    const segmentB = await prisma.planSegment.create({
      data: {
        id: "segment-b",
        projectId: project.id,
        order: 2,
        name: "Phase B",
        startDate: new Date("2026-05-11T00:00:00.000Z"),
        endDate: new Date("2026-05-18T00:00:00.000Z"),
        goals: ["ship export"],
      },
    });

    await prisma.planDay.create({
      data: {
        id: "plan-day-1",
        projectId: project.id,
        segmentId: segmentA.id,
        date: new Date("2026-05-03T00:00:00.000Z"),
        title: "Day 1",
        plannedTasks: ["read plan"],
      },
    });

    await prisma.dailyLog.createMany({
      data: [
        {
          id: "daily-b",
          projectId: project.id,
          date: new Date("2026-05-04T00:00:00.000Z"),
          whatDone: ["second"],
          whatSkipped: [],
          timeSpentMinutes: 30,
          tomorrowFirstThing: "second",
          honestyNote: null,
        },
        {
          id: "daily-a",
          projectId: project.id,
          date: new Date("2026-05-03T00:00:00.000Z"),
          whatDone: ["first"],
          whatSkipped: [],
          timeSpentMinutes: 20,
          tomorrowFirstThing: "first",
          honestyNote: "plain",
        },
      ],
    });

    await prisma.weeklyLog.createMany({
      data: [
        {
          id: "weekly-b",
          projectId: project.id,
          weekStart: new Date("2026-05-12T00:00:00.000Z"),
          reflections: { q1: "b", q2: "b", q3: "b", q4: "b", q5: "b", q6: "b" },
          selfScores: { clarity: 2 },
        },
        {
          id: "weekly-a",
          projectId: project.id,
          weekStart: new Date("2026-05-05T00:00:00.000Z"),
          reflections: { q1: "a", q2: "a", q3: "a", q4: "a", q5: "a", q6: "a" },
          selfScores: { clarity: 1 },
        },
      ],
    });

    await prisma.retro.createMany({
      data: [
        {
          id: "retro-b",
          segmentId: segmentB.id,
          metrics: {
            commits: 2,
            logs: 2,
            learnings: 1,
            bugs: 0,
            prompts: 1,
            planned_days: 3,
            drift_days: 0,
          },
          selfScores: {
            clarity: 2,
            honesty: 2,
            output: 2,
            depth: 2,
            discipline: 2,
            energy: 2,
          },
          threeQuestions: { q1: "b1", q2: "b2", q3: "b3" },
          scopeChanges: [{ change: "b", reason: "b" }],
          nextPhaseFirstThing: "b-next",
        },
        {
          id: "retro-a",
          segmentId: segmentA.id,
          metrics: {
            commits: 1,
            logs: 1,
            learnings: 1,
            bugs: 1,
            prompts: 0,
            planned_days: 2,
            drift_days: 1,
          },
          selfScores: {
            clarity: 1,
            honesty: 1,
            output: 1,
            depth: 1,
            discipline: 1,
            energy: 1,
          },
          threeQuestions: { q1: "a1", q2: "a2", q3: "a3" },
          scopeChanges: [{ change: "a", reason: "a" }],
          nextPhaseFirstThing: "a-next",
        },
      ],
    });

    await prisma.knowledgeItem.createMany({
      data: [
        {
          id: "knowledge-b",
          projectId: project.id,
          type: "bug",
          title: "Second knowledge",
          slug: "second-knowledge",
          bodyMd: "second body",
          tags: ["second"],
          metadata: { rank: 2 },
        },
        {
          id: "knowledge-a",
          projectId: project.id,
          type: "learning",
          title: "First knowledge",
          slug: "first-knowledge",
          bodyMd: "first body",
          tags: ["first"],
          metadata: { rank: 1 },
        },
      ],
    });

    await prisma.artifact.createMany({
      data: [
        {
          id: "artifact-b",
          ownerType: "knowledge_item",
          ownerId: "knowledge-b",
          kind: "link",
          urlOrPath: "https://example.test/b",
          title: "Artifact B",
          note: null,
        },
        {
          id: "artifact-a",
          ownerType: "knowledge_item",
          ownerId: "knowledge-a",
          kind: "link",
          urlOrPath: "https://example.test/a",
          title: "Artifact A",
          note: "plain",
        },
      ],
    });

    await prisma.openItem.createMany({
      data: [
        {
          id: "open-b",
          projectId: project.id,
          text: "Second open item",
          openedAt: new Date("2026-05-06T00:00:00.000Z"),
          source: "daily_log",
          status: "open",
        },
        {
          id: "open-a",
          projectId: project.id,
          text: "First open item",
          openedAt: new Date("2026-05-05T00:00:00.000Z"),
          source: "manual",
          status: "open",
        },
      ],
    });

    await prisma.blocker.createMany({
      data: [
        {
          id: "blocker-b",
          projectId: project.id,
          text: "Second blocker",
          openedAt: new Date("2026-05-08T00:00:00.000Z"),
          resolvedAt: null,
        },
        {
          id: "blocker-a",
          projectId: project.id,
          text: "First blocker",
          openedAt: new Date("2026-05-07T00:00:00.000Z"),
          resolvedAt: null,
        },
      ],
    });

    await prisma.bookmark.createMany({
      data: [
        {
          id: "bookmark-b",
          projectId: project.id,
          label: "Bookmark B",
          targetType: "knowledge_item",
          targetId: "knowledge-b",
        },
        {
          id: "bookmark-a",
          projectId: project.id,
          label: "Bookmark A",
          targetType: "knowledge_item",
          targetId: "knowledge-a",
        },
      ],
    });

    const envelope = await collectExportData(prisma);

    expect(Object.keys(envelope)).toEqual(["schema_version", "exported_at", "tables"]);
    expect(Object.keys(envelope.tables)).toEqual(EXPORT_TABLE_KEYS);
    expect(envelope.schema_version.migrations).toHaveLength(1);
    expect(envelope.schema_version.committed_migrations_count).toBe(
      readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length,
    );

    expect(envelope.tables.daily_log.map((row) => row.id)).toEqual(["daily-a", "daily-b"]);
    expect(envelope.tables.weekly_log.map((row) => row.id)).toEqual(["weekly-a", "weekly-b"]);
    expect(envelope.tables.retro.map((row) => row.id)).toEqual(["retro-a", "retro-b"]);
    expect(envelope.tables.knowledge_item.map((row) => row.id)).toEqual(["knowledge-a", "knowledge-b"]);
    expect(envelope.tables.artifact.map((row) => row.id)).toEqual(["artifact-a", "artifact-b"]);
    expect(envelope.tables.open_item.map((row) => row.id)).toEqual(["open-a", "open-b"]);
    expect(envelope.tables.blocker.map((row) => row.id)).toEqual(["blocker-a", "blocker-b"]);
    expect(envelope.tables.bookmark.map((row) => row.id)).toEqual(["bookmark-a", "bookmark-b"]);

    expect("project" in envelope.tables).toBe(false);
    expect("plan_segment" in envelope.tables).toBe(false);
    expect("plan_day" in envelope.tables).toBe(false);
  });
});

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
