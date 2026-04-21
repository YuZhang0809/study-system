import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  return entries.map((dir) =>
    readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"),
  );
}

let dbPath: string;
let prisma: PrismaClient;

beforeEach(async () => {
  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
  );
  const raw = new Database(dbPath);
  for (const sql of readAllMigrationSql()) raw.exec(sql);
  raw.close();

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  prisma = new PrismaClient({ adapter });
});

afterEach(async () => {
  await prisma.$disconnect();
  if (existsSync(dbPath)) unlinkSync(dbPath);
});

describe("schema round-trip", () => {
  it("round-trips every PRD §3 entity", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Test Project",
        startDate: new Date("2026-04-21"),
        endDate: new Date("2026-07-20"),
        hasPlanStructure: "full",
        status: "active",
      },
    });
    expect(project.id).toBeTruthy();
    expect(project.name).toBe("Test Project");

    const segment = await prisma.planSegment.create({
      data: {
        projectId: project.id,
        order: 1,
        name: "Foundations",
        startDate: new Date("2026-04-21"),
        endDate: new Date("2026-05-11"),
        goals: ["ship scaffold", "land schema"],
      },
    });
    expect(segment.goals).toEqual(["ship scaffold", "land schema"]);

    const day = await prisma.planDay.create({
      data: {
        segmentId: segment.id,
        projectId: project.id,
        date: new Date("2026-04-21"),
        title: "Kickoff",
        plannedTasks: ["read PRD", "open ExecPlan"],
      },
    });
    expect(day.plannedTasks).toEqual(["read PRD", "open ExecPlan"]);

    const daily = await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-04-21"),
        whatDone: ["scaffold", "schema"],
        whatSkipped: [],
        timeSpentMinutes: 120,
        tomorrowFirstThing: "start seed CLI",
        honestyNote: null,
      },
    });
    expect(daily.timeSpentMinutes).toBe(120);
    expect(daily.whatDone).toEqual(["scaffold", "schema"]);

    const weekly = await prisma.weeklyLog.create({
      data: {
        projectId: project.id,
        weekStart: new Date("2026-04-20"),
        reflections: { q1: "a1", q2: "a2", q3: "a3", q4: "a4", q5: "a5", q6: "a6" },
        selfScores: { focus: 3, rigor: 4 },
      },
    });
    expect(weekly.reflections).toMatchObject({ q1: "a1", q6: "a6" });

    const retro = await prisma.retro.create({
      data: {
        segmentId: segment.id,
        metrics: { daysLogged: 10 },
        selfScores: { overall: 3 },
        threeQuestions: { kept: "x", changed: "y", killed: "z" },
        scopeChanges: [{ from: "A", to: "B" }],
      },
    });
    expect(retro.segmentId).toBe(segment.id);

    const knowledge = await prisma.knowledgeItem.create({
      data: {
        projectId: project.id,
        type: "concept",
        title: "CAP Theorem",
        slug: "cap-theorem",
        bodyMd: "Consistency, Availability, Partition tolerance.",
        tags: ["distributed", "theory"],
        metadata: { source: "textbook" },
      },
    });
    expect(knowledge.slug).toBe("cap-theorem");

    const artifact = await prisma.artifact.create({
      data: {
        ownerType: "knowledge_item",
        ownerId: knowledge.id,
        kind: "link",
        urlOrPath: "https://example.test/cap",
        title: "CAP primer",
        note: null,
      },
    });
    const artifactsForKnowledge = await prisma.artifact.findMany({
      where: { ownerType: "knowledge_item", ownerId: knowledge.id },
    });
    expect(artifactsForKnowledge).toHaveLength(1);
    expect(artifactsForKnowledge[0].id).toBe(artifact.id);

    const openItem = await prisma.openItem.create({
      data: {
        projectId: project.id,
        text: "draft seed CLI plan",
        openedAt: new Date("2026-04-21"),
        source: "daily_log",
        status: "open",
      },
    });
    expect(openItem.status).toBe("open");

    const blocker = await prisma.blocker.create({
      data: {
        projectId: project.id,
        text: "awaiting design decision",
        openedAt: new Date("2026-04-21"),
        resolvedAt: null,
      },
    });
    expect(blocker.resolvedAt).toBeNull();

    const bookmark = await prisma.bookmark.create({
      data: {
        projectId: project.id,
        label: "Today's knowledge",
        targetType: "knowledge_item",
        targetId: knowledge.id,
      },
    });
    expect(bookmark.targetId).toBe(knowledge.id);

    const reloaded = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        segments: true,
        planDays: true,
        dailyLogs: true,
        weeklyLogs: true,
        knowledgeItems: true,
        openItems: true,
        blockers: true,
        bookmarks: true,
      },
    });
    expect(reloaded.segments).toHaveLength(1);
    expect(reloaded.planDays).toHaveLength(1);
    expect(reloaded.dailyLogs).toHaveLength(1);
    expect(reloaded.weeklyLogs).toHaveLength(1);
    expect(reloaded.knowledgeItems).toHaveLength(1);
    expect(reloaded.openItems).toHaveLength(1);
    expect(reloaded.blockers).toHaveLength(1);
    expect(reloaded.bookmarks).toHaveLength(1);
  });
});
