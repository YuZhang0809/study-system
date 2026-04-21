import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { createSeedPrismaClient } from "../lib/seed/prisma";

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");
const fixturePath = path.resolve(__dirname, "fixtures", "seed-smoke.yaml");
const fixtureYaml = readFileSync(fixturePath, "utf8");
const webDir = path.resolve(__dirname, "..");

let tempDir: string;
let dbPath: string;
let prisma: ReturnType<typeof createSeedPrismaClient>;

beforeEach(async () => {
  tempDir = mkdtempSync(path.join(os.tmpdir(), "study-system-seed-cli-"));
  dbPath = path.join(tempDir, "seed-cli.db");

  const raw = new Database(dbPath);
  for (const sql of readAllMigrationSql()) {
    raw.exec(sql);
  }
  raw.close();

  prisma = createSeedPrismaClient(`file:${dbPath}`);
});

afterEach(async () => {
  await prisma.$disconnect();
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("seed CLI", () => {
  it("enforces project name uniqueness at the database layer", async () => {
    await prisma.project.create({
      data: {
        name: "Duplicate Project",
        startDate: new Date("2026-05-03"),
        endDate: new Date("2026-05-07"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    await expect(
      prisma.project.create({
        data: {
          name: "Duplicate Project",
          startDate: new Date("2026-05-10"),
          endDate: new Date("2026-05-14"),
          hasPlanStructure: "full",
          status: "draft",
        },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
      meta: {
        modelName: "Project",
        driverAdapterError: {
          cause: {
            constraint: {
              fields: ["name"],
            },
          },
        },
      },
    });
  });

  it("enforces segment order uniqueness within a project at the database layer", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Segment Constraint Project",
        startDate: new Date("2026-05-03"),
        endDate: new Date("2026-05-07"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    await prisma.planSegment.create({
      data: {
        projectId: project.id,
        order: 1,
        name: "Phase 1",
        startDate: new Date("2026-05-03"),
        endDate: new Date("2026-05-04"),
        goals: ["first"],
      },
    });

    await expect(
      prisma.planSegment.create({
        data: {
          projectId: project.id,
          order: 1,
          name: "Phase 1 duplicate",
          startDate: new Date("2026-05-05"),
          endDate: new Date("2026-05-06"),
          goals: ["second"],
        },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
      meta: {
        modelName: "PlanSegment",
        driverAdapterError: {
          cause: {
            constraint: {
              fields: ["projectId", "order"],
            },
          },
        },
      },
    });
  });

  it("inserts a second project when the yaml project name is different", async () => {
    expectSuccess(runSeed([fixturePath]));

    const secondProjectYaml = writePlanFile(
      "second-project.yaml",
      fixtureYaml.replace('name: "Seed Smoke Project"', 'name: "Second Seed Smoke Project"'),
    );

    const run = runSeed([secondProjectYaml]);
    expectSuccess(run);
    expect(run.stdout).toContain('project "Second Seed Smoke Project"  INSERT');
    expect(run.stdout).toContain("summary: inserted 9 / updated 0 / noop 0 / orphans 0");
    expect(await planCounts()).toEqual({ projects: 2, segments: 6, days: 10 });
  });

  it("updates the existing project when the yaml name matches and project fields drift", async () => {
    expectSuccess(runSeed([fixturePath]));

    const updatedProjectYaml = writePlanFile(
      "updated-project.yaml",
      fixtureYaml.replace("start_date: 2026-05-03", "start_date: 2026-05-02"),
    );

    const run = runSeed([updatedProjectYaml]);
    expectSuccess(run);
    expect(run.stdout).toContain('project "Seed Smoke Project"  UPDATE');
    expect(run.stdout).toContain("startDate  2026-05-03 -> 2026-05-02");
    expect(run.stdout).toContain("summary: inserted 0 / updated 1 / noop 8 / orphans 0");

    const projects = await prisma.project.findMany({
      where: { name: "Seed Smoke Project" },
      select: { startDate: true },
    });
    expect(projects).toHaveLength(1);
    expect(projects[0].startDate.toISOString().slice(0, 10)).toBe("2026-05-02");
    expect(await planCounts()).toEqual({ projects: 1, segments: 3, days: 5 });
  });

  it("seeds the smoke fixture, reruns idempotently, and preserves user tables", async () => {
    const dryRun = runSeed([fixturePath, "--dry-run"]);
    expectSuccess(dryRun);
    expect(dryRun.stdout).toContain('project "Seed Smoke Project"  INSERT');
    expect(dryRun.stdout).toContain("DRY RUN - no writes performed.");
    expect(await planCounts()).toEqual({ projects: 0, segments: 0, days: 0 });

    const firstRun = runSeed([fixturePath]);
    expectSuccess(firstRun);
    expect(firstRun.stdout).toContain("summary: inserted 9 / updated 0 / noop 0 / orphans 0");
    expect(await planCounts()).toEqual({ projects: 1, segments: 3, days: 5 });

    await insertUserRows();
    const beforeCounts = await userTableCounts();

    const secondRun = runSeed([fixturePath]);
    expectSuccess(secondRun);
    expect(secondRun.stdout).toContain("summary: inserted 0 / updated 0 / noop 9 / orphans 0");
    expect(secondRun.stdout).not.toMatch(/\bUPDATE\b/);
    expect(await userTableCounts()).toEqual(beforeCounts);

    const modifiedYaml = writePlanFile(
      "modified.yaml",
      `
project:
  name: "Seed Smoke Project"
  start_date: 2026-05-03
  end_date: 2026-05-07
  has_plan_structure: full
  status: active
segments:
  - order: 1
    name: "Phase 1 - Foundations"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals:
      - "Read the repo contract"
      - "Land the scaffold"
  - order: 2
    name: "Phase 2 - CLI Wiring Revised"
    start_date: 2026-05-05
    end_date: 2026-05-06
    goals:
      - "Wire the seed pipeline"
  - order: 3
    name: "Phase 3 - Closure"
    start_date: 2026-05-07
    end_date: 2026-05-07
    goals:
      - "Close the slice"
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1 - Read the contract"
    planned_tasks:
      - "Read PRD"
      - "Read STATE"
  - date: 2026-05-04
    segment_order: 1
    title: "Day 2 - Validate the shell"
    planned_tasks:
      - "Inspect schema"
  - date: 2026-05-05
    segment_order: 2
    title: "Day 3 - Wire the CLI"
    planned_tasks:
      - "Parse yaml"
  - date: 2026-05-06
    segment_order: 2
    title: "Day 4 - Test drift"
    planned_tasks:
      - "Run integration test"
`,
    );

    const thirdRun = runSeed([modifiedYaml]);
    expectSuccess(thirdRun);
    expect(thirdRun.stdout).toMatch(/\bUPDATE\b/);
    expect(thirdRun.stdout).toContain("orphans (present in DB, absent from yaml - NOT touched, NOT deleted):");
    expect(await userTableCounts()).toEqual(beforeCounts);
    expect(await planCounts()).toEqual({ projects: 1, segments: 3, days: 5 });
  });

  it("shows segment blast radius when a segment boundary shifts under existing daily logs", async () => {
    expectSuccess(runSeed([fixturePath]));
    const project = await prisma.project.findFirstOrThrow({ where: { name: "Seed Smoke Project" } });

    const dailyLog = await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-05"),
        whatDone: ["wired cli"],
        whatSkipped: [],
        timeSpentMinutes: 90,
        tomorrowFirstThing: "check blast radius",
        honestyNote: "kept it narrow",
      },
    });

    const shiftedYaml = writePlanFile(
      "shifted-segment.yaml",
      `
project:
  name: "Seed Smoke Project"
  start_date: 2026-05-03
  end_date: 2026-05-07
  has_plan_structure: full
  status: active
segments:
  - order: 1
    name: "Phase 1 - Foundations"
    start_date: 2026-05-03
    end_date: 2026-05-05
    goals:
      - "Read the repo contract"
      - "Land the scaffold"
  - order: 2
    name: "Phase 2 - CLI Wiring"
    start_date: 2026-05-06
    end_date: 2026-05-06
    goals:
      - "Wire the seed pipeline"
  - order: 3
    name: "Phase 3 - Closure"
    start_date: 2026-05-07
    end_date: 2026-05-07
    goals:
      - "Close the slice"
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1 - Read the contract"
    planned_tasks:
      - "Read PRD"
      - "Read STATE"
  - date: 2026-05-04
    segment_order: 1
    title: "Day 2 - Validate the shell"
    planned_tasks:
      - "Inspect schema"
  - date: 2026-05-05
    segment_order: 1
    title: "Day 3 - Wire the CLI"
    planned_tasks:
      - "Parse yaml"
  - date: 2026-05-06
    segment_order: 2
    title: "Day 4 - Test drift"
    planned_tasks:
      - "Run integration test"
  - date: 2026-05-07
    segment_order: 3
    title: "Day 5 - Close the slice"
    planned_tasks:
      - "Write closure note"
`,
    );

    const run = runSeed([shiftedYaml]);
    expectSuccess(run);
    expect(run.stdout).toMatch(/order=1  UPDATE/);
    expect(run.stdout).toMatch(/touches 1 daily_logs whose phase membership will shift/);

    const reloaded = await prisma.dailyLog.findUniqueOrThrow({
      where: {
        projectId_date: {
          projectId: project.id,
          date: new Date("2026-05-05"),
        },
      },
    });
    expect(reloaded.id).toBe(dailyLog.id);
    expect(reloaded.whatDone).toEqual(["wired cli"]);
  });

  it("shows day blast radius when editing a day that already has a daily log", async () => {
    expectSuccess(runSeed([fixturePath]));
    const project = await prisma.project.findFirstOrThrow({ where: { name: "Seed Smoke Project" } });

    await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-03"),
        whatDone: ["read contract"],
        whatSkipped: [],
        timeSpentMinutes: 45,
        tomorrowFirstThing: "rename day",
        honestyNote: null,
      },
    });

    const editedDayYaml = writePlanFile(
      "edited-day.yaml",
      fixtureYaml.replace("Day 1 - Read the contract", "Day 1 - Read the contract carefully"),
    );

    const run = runSeed([editedDayYaml]);
    expectSuccess(run);
    expect(run.stdout).toMatch(/2026-05-03  UPDATE/);
    expect(run.stdout).toContain("(1 daily_log already written for this date)");

    const reloaded = await prisma.dailyLog.findUniqueOrThrow({
      where: {
        projectId_date: {
          projectId: project.id,
          date: new Date("2026-05-03"),
        },
      },
    });
    expect(reloaded.tomorrowFirstThing).toBe("rename day");
  });

  it("preserves orphaned days and their daily logs", async () => {
    expectSuccess(runSeed([fixturePath]));
    const project = await prisma.project.findFirstOrThrow({ where: { name: "Seed Smoke Project" } });

    await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-07"),
        whatDone: ["closed slice"],
        whatSkipped: [],
        timeSpentMinutes: 30,
        tomorrowFirstThing: "leave orphan alone",
        honestyNote: null,
      },
    });

    const orphanYaml = writePlanFile(
      "orphan-day.yaml",
      `
project:
  name: "Seed Smoke Project"
  start_date: 2026-05-03
  end_date: 2026-05-07
  has_plan_structure: full
  status: active
segments:
  - order: 1
    name: "Phase 1 - Foundations"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals:
      - "Read the repo contract"
      - "Land the scaffold"
  - order: 2
    name: "Phase 2 - CLI Wiring"
    start_date: 2026-05-05
    end_date: 2026-05-06
    goals:
      - "Wire the seed pipeline"
  - order: 3
    name: "Phase 3 - Closure"
    start_date: 2026-05-07
    end_date: 2026-05-07
    goals:
      - "Close the slice"
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1 - Read the contract"
    planned_tasks:
      - "Read PRD"
      - "Read STATE"
  - date: 2026-05-04
    segment_order: 1
    title: "Day 2 - Validate the shell"
    planned_tasks:
      - "Inspect schema"
  - date: 2026-05-05
    segment_order: 2
    title: "Day 3 - Wire the CLI"
    planned_tasks:
      - "Parse yaml"
  - date: 2026-05-06
    segment_order: 2
    title: "Day 4 - Test drift"
    planned_tasks:
      - "Run integration test"
`,
    );

    const run = runSeed([orphanYaml]);
    expectSuccess(run);
    expect(run.stdout).toContain("orphans (present in DB, absent from yaml - NOT touched, NOT deleted):");
    expect(run.stdout).toMatch(/day\s+2026-05-07\s+\(1 daily_log already written\)/);

    const orphanDay = await prisma.planDay.findFirst({
      where: {
        projectId: project.id,
        date: new Date("2026-05-07"),
      },
    });
    expect(orphanDay).not.toBeNull();

    const orphanLog = await prisma.dailyLog.findUniqueOrThrow({
      where: {
        projectId_date: {
          projectId: project.id,
          date: new Date("2026-05-07"),
        },
      },
    });
    expect(orphanLog.whatDone).toEqual(["closed slice"]);
  });
});

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}

function runSeed(args: string[]) {
  const command = ["npm", "run", "seed", "--", ...args.map(quoteArg)].join(" ");

  return spawnSync(command, {
    cwd: webDir,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
    },
  });
}

function expectSuccess(result: ReturnType<typeof runSeed>): void {
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `seed command failed with status ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

function quoteArg(value: string): string {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function writePlanFile(fileName: string, contents: string): string {
  const target = path.join(tempDir, fileName);
  writeFileSync(target, contents.trimStart(), "utf8");
  return target;
}

async function planCounts() {
  return {
    projects: await prisma.project.count(),
    segments: await prisma.planSegment.count(),
    days: await prisma.planDay.count(),
  };
}

async function userTableCounts() {
  return {
    dailyLogs: await prisma.dailyLog.count(),
    weeklyLogs: await prisma.weeklyLog.count(),
    retros: await prisma.retro.count(),
    knowledgeItems: await prisma.knowledgeItem.count(),
    artifacts: await prisma.artifact.count(),
    openItems: await prisma.openItem.count(),
    blockers: await prisma.blocker.count(),
    bookmarks: await prisma.bookmark.count(),
  };
}

async function insertUserRows(): Promise<void> {
  const project = await prisma.project.findFirstOrThrow({ where: { name: "Seed Smoke Project" } });
  const firstSegment = await prisma.planSegment.findFirstOrThrow({
    where: { projectId: project.id, order: 1 },
  });

  const knowledge = await prisma.knowledgeItem.create({
    data: {
      projectId: project.id,
      type: "learning",
      title: "Seed insight",
      slug: "seed-insight",
      bodyMd: "Only structured seed data belongs here.",
      tags: ["seed"],
      metadata: { source: "integration" },
    },
  });

  await prisma.dailyLog.create({
    data: {
      projectId: project.id,
      date: new Date("2026-05-03"),
      whatDone: ["seeded fixture"],
      whatSkipped: [],
      timeSpentMinutes: 60,
      tomorrowFirstThing: "re-run idempotently",
      honestyNote: null,
    },
  });

  await prisma.weeklyLog.create({
    data: {
      projectId: project.id,
      weekStart: new Date("2026-04-27"),
      reflections: { q1: "a1", q2: "a2", q3: "a3", q4: "a4", q5: "a5", q6: "a6" },
      selfScores: { rigor: 4 },
    },
  });

  await prisma.retro.create({
    data: {
      segmentId: firstSegment.id,
      metrics: { logs: 1 },
      selfScores: { focus: 3 },
      threeQuestions: { kept: "x", changed: "y", killed: "z" },
      scopeChanges: [{ from: "old", to: "new" }],
    },
  });

  await prisma.artifact.create({
    data: {
      ownerType: "knowledge_item",
      ownerId: knowledge.id,
      kind: "link",
      urlOrPath: "https://example.test/seed",
      title: "Seed artifact",
      note: "pointer only",
    },
  });

  await prisma.openItem.create({
    data: {
      projectId: project.id,
      text: "Check seed summary",
      openedAt: new Date("2026-05-03"),
      source: "daily_log",
      status: "open",
    },
  });

  await prisma.blocker.create({
    data: {
      projectId: project.id,
      text: "None",
      openedAt: new Date("2026-05-03"),
      resolvedAt: null,
    },
  });

  await prisma.bookmark.create({
    data: {
      projectId: project.id,
      label: "Seed bookmark",
      targetType: "knowledge_item",
      targetId: knowledge.id,
    },
  });
}
