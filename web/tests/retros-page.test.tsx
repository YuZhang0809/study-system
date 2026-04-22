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

    await renderRetrosRoute({ project: project.id });

    expect(screen.getByRole("button", { name: /本周复盘/i })).toBeTruthy();
    expect(screen.getByText("还没写过周记 · 右上 本周复盘 开始")).toBeTruthy();
  });

  it("keeps the page-head button on 本周复盘 when only a previous-week log exists", async () => {
    const project = await seedProject("Weekly Previous Log Project");
    await seedWeeklyLog(project.id, "2026-05-04", {
      q6: "跑 benchmark",
    });

    await renderRetrosRoute({ project: project.id });

    expect(screen.getByRole("button", { name: /本周复盘/i })).toBeTruthy();
    expect(screen.getByText("第 1 周")).toBeTruthy();
    expect(screen.getAllByText((content) => content.includes("提交于"))).toHaveLength(1);
  });

  it("shows 修改本周 when the current-week log exists", async () => {
    const project = await seedProject("Weekly Current Log Project");
    await seedWeeklyLog(project.id, "2026-05-11");

    await renderRetrosRoute({ project: project.id });

    expect(screen.getByRole("button", { name: /修改本周/i })).toBeTruthy();
    expect(screen.getByText("第 2 周")).toBeTruthy();
  });

  it("renders the phase placeholder card when ?tab=phase is selected", async () => {
    const project = await seedProject("Weekly Phase Placeholder Project");

    await renderRetrosRoute({ project: project.id, tab: "phase" });

    expect(screen.getByText("阶段复盘 · 下一刀做")).toBeTruthy();
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
