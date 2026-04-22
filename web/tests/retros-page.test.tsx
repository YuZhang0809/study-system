// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import RetrosPage from "../app/retros/page";
import { createAppPrismaClient } from "../lib/prisma";

vi.mock("@/lib/weekly-log/actions", () => ({
  upsertWeeklyLog: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/retro/actions", () => ({
  upsertRetro: vi.fn(async () => ({ ok: true })),
}));

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");

let dbPath: string;
let prisma: PrismaClient;
let originalDatabaseUrl: string | undefined;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-12T12:00:00.000Z"));

  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-retros-page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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
  cleanup();
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

describe("/retros page", () => {
  it("renders the no-project empty state", async () => {
    await renderRetrosRoute();

    expect(screen.getByText("还没有项目 · 跑 npm run seed 导入一个计划")).toBeTruthy();
    expect(screen.getByText("复盘")).toBeTruthy();
  });

  it("renders the weekly empty state and the 本周复盘 button for a seeded project with zero logs", async () => {
    const project = await seedProject("Weekly Empty Project");

    await renderRetrosRoute({ project: project.id, tab: "weekly" });

    expect(screen.getByRole("button", { name: /本周复盘/i })).toBeTruthy();
    expect(screen.getByText("还没写过周记 · 右上 本周复盘 开始")).toBeTruthy();
  });

  it("keeps the page-head button on 本周复盘 when only a previous-week log exists", async () => {
    const project = await seedProject("Weekly Previous Log Project");
    await seedWeeklyLog(project.id, "2026-05-04", {
      q6: "跑 benchmark",
    });

    await renderRetrosRoute({ project: project.id, tab: "weekly" });

    expect(screen.getByRole("button", { name: /本周复盘/i })).toBeTruthy();
    expect(screen.getByText("第 1 周")).toBeTruthy();
    expect(screen.getAllByText((content) => content.includes("提交于"))).toHaveLength(1);
  });

  it("shows 修改本周 when the current-week log exists", async () => {
    const project = await seedProject("Weekly Current Log Project");
    await seedWeeklyLog(project.id, "2026-05-11");

    await renderRetrosRoute({ project: project.id, tab: "weekly" });

    expect(screen.getByRole("button", { name: /修改本周/i })).toBeTruthy();
    expect(screen.getByText("第 2 周")).toBeTruthy();
  });

  it("renders the phase empty state when ?tab=phase is selected", async () => {
    const project = await seedProject("Phase Empty Project");

    await renderRetrosRoute({ project: project.id, tab: "phase" });

    expect(screen.getByText("还没有阶段 · 先把计划跑到段终点再回来")).toBeTruthy();
  });

  it("defaults to the phase tab when no tab param is present", async () => {
    const project = await seedProject("Phase Default Project");

    await renderRetrosRoute({ project: project.id });

    expect(screen.getByText("还没有阶段 · 先把计划跑到段终点再回来")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /阶段复盘/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows the eligible-segment caption when a later finished segment still needs a retro", async () => {
    const project = await seedProject("Eligible Segment Project");
    const firstSegment = await seedSegment(project.id, {
      order: 1,
      name: "Foundations",
      startDate: "2026-05-03",
      endDate: "2026-05-08",
    });
    await seedSegment(project.id, {
      order: 2,
      name: "Shipping",
      startDate: "2026-05-09",
      endDate: "2026-05-10",
    });
    await seedRetro(firstSegment.id);

    await renderRetrosRoute({ project: project.id });

    expect(screen.getByText("下一段 · 第 2 阶段 — Shipping · 点 阶段复盘 开始")).toBeTruthy();
    expect(screen.getByText("第 1 阶段 — Foundations")).toBeTruthy();
  });

  it("renders a committed retro card with all seven metrics", async () => {
    const project = await seedProject("Retro Card Project");
    const segment = await seedSegment(project.id, {
      order: 1,
      name: "Foundations",
      startDate: "2026-05-03",
      endDate: "2026-05-08",
    });
    await seedRetro(segment.id, {
      metrics: {
        commits: 4,
        logs: 5,
        learnings: 3,
        bugs: 1,
        prompts: 2,
        planned_days: 6,
        drift_days: 2,
      },
    });

    await renderRetrosRoute({ project: project.id });

    expect(screen.getByText("第 1 阶段 — Foundations")).toBeTruthy();
    expect(screen.getByText("提交数")).toBeTruthy();
    expect(screen.getByText("日记数")).toBeTruthy();
    expect(screen.getByText("心得数")).toBeTruthy();
    expect(screen.getByText("缺陷数")).toBeTruthy();
    expect(screen.getByText("提示数")).toBeTruthy();
    expect(screen.getByText("计划天")).toBeTruthy();
    expect(screen.getByText("偏离天")).toBeTruthy();
  });

  it("renders the phase wizard in place when ?tab=phase&wizard=1 is selected", async () => {
    const project = await seedProject("Phase Wizard Project");
    await seedSegment(project.id, {
      order: 1,
      name: "Foundations",
      startDate: "2026-05-03",
      endDate: "2026-05-08",
    });

    await renderRetrosRoute({ project: project.id, tab: "phase", wizard: "1" });

    expect(screen.getByText("阶段复盘 · 向导")).toBeTruthy();
    expect(screen.getByText("指标 · 先看数字，不允许绕过")).toBeTruthy();
    expect(screen.getByText("第 1 阶段 — Foundations · 收官")).toBeTruthy();
  });
});

async function renderRetrosRoute(query: Record<string, string> = {}) {
  cleanup();
  const page = await RetrosPage({
    searchParams: Promise.resolve(query),
  });

  return render(page);
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

async function seedSegment(
  projectId: string,
  input: {
    order: number;
    name: string;
    startDate: string;
    endDate: string;
  },
) {
  return prisma.planSegment.create({
    data: {
      projectId,
      order: input.order,
      name: input.name,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      endDate: new Date(`${input.endDate}T00:00:00.000Z`),
      goals: [],
    },
  });
}

async function seedRetro(
  segmentId: string,
  overrides: Partial<{
    metrics: {
      commits: number;
      logs: number;
      learnings: number;
      bugs: number;
      prompts: number;
      planned_days: number;
      drift_days: number;
    };
    selfScores: {
      clarity: number;
      honesty: number;
      output: number;
      depth: number;
      discipline: number;
      energy: number;
    };
    threeQuestions: {
      q1: string;
      q2: string;
      q3: string;
    };
    scopeChanges: Array<{
      change: string;
      reason: string;
    }>;
    nextPhaseFirstThing: string;
  }> = {},
) {
  return prisma.retro.create({
    data: {
      segmentId,
      metrics: overrides.metrics ?? {
        commits: 2,
        logs: 4,
        learnings: 3,
        bugs: 1,
        prompts: 2,
        planned_days: 5,
        drift_days: 1,
      },
      selfScores: overrides.selfScores ?? {
        clarity: 3,
        honesty: 4,
        output: 3,
        depth: 4,
        discipline: 3,
        energy: 2,
      },
      threeQuestions: overrides.threeQuestions ?? {
        q1: "搞懂了先拉证据再下判断。",
        q2: "骗自己搞懂了缓存边界。",
        q3: "可以先砍掉环境折腾。",
      },
      scopeChanges: overrides.scopeChanges ?? [
        {
          change: "砍掉环境折腾",
          reason: "ROI 太低",
        },
      ],
      nextPhaseFirstThing: overrides.nextPhaseFirstThing ?? "继续跑 baseline",
    },
  });
}

async function seedWeeklyLog(
  projectId: string,
  weekStart: string,
  reflectionOverrides: Partial<{
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
  }> = {},
) {
  await prisma.weeklyLog.create({
    data: {
      projectId,
      weekStart: new Date(`${weekStart}T00:00:00.000Z`),
      reflections: {
        q1: "本周最重要的学到是先看证据。",
        q2: "最浪费时间的是没有先切最小问题。",
        q3: "偏离了两天。",
        q4: "兑现了一半。",
        q5: "新开了一个 blocker。",
        q6: "周一先跑 baseline。",
        ...reflectionOverrides,
      },
      selfScores: {
        clarity: 3,
        honesty: 4,
        output: 3,
        depth: 4,
        discipline: 3,
        energy: 2,
      },
      createdAt: new Date(`${weekStart}T13:45:00.000Z`),
      updatedAt: new Date(`${weekStart}T13:45:00.000Z`),
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
