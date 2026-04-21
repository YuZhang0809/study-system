// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import TodayPage from "../app/today/page";
import { Sidebar } from "../components/shell/Sidebar";
import { createAppPrismaClient } from "../lib/prisma";

let currentSearchParams = new URLSearchParams();
let currentPathname = "/today";

vi.mock("@/lib/daily-log/actions", () => ({
  upsertDailyLog: vi.fn(async () => ({ ok: true })),
  createOpenItem: vi.fn(async () => ({ ok: true })),
  closeOpenItem: vi.fn(async () => ({ ok: true })),
  createBlocker: vi.fn(async () => ({ ok: true })),
  resolveBlocker: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
    `tmp-today-page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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
  currentSearchParams = new URLSearchParams();
  currentPathname = "/today";
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

describe("/today page", () => {
  it("renders the active project shell, page-head button, and block empty states", async () => {
    const project = await seedProject({
      name: "Today Project",
      startDate: "2026-05-03",
      endDate: "2026-05-05",
      segmentName: "Phase 1 - Foundations",
    });

    await renderTodayRoute({ project: project.id });

    expect(screen.getByText((content) => content.includes("Phase 1 - Foundations · 第 3 天"))).toBeTruthy();

    const timeline = getTimeline();
    const timelineCells = within(timeline).getAllByRole("listitem");
    expect(timelineCells).toHaveLength(3);
    expect(timelineCells[2].getAttribute("aria-current")).toBe("date");
    expect(timelineCells[2].getAttribute("aria-label")).toBe("2026-05-05");

    expect(screen.getByText("Day 3 - Work the plan")).toBeTruthy();
    expect(screen.getByText("Parse yaml")).toBeTruthy();
    expect(screen.getByText("Run integration test")).toBeTruthy();

    expect(screen.getByRole("button", { name: /今日收工/i })).toBeTruthy();
    expect(screen.queryByText("今日日志 · 2026-05-05")).toBeNull();
    expect(screen.getByText("昨日未留下第一件事")).toBeTruthy();
    expect(screen.getByText("尚未记录 · 用 /knowledge 新建第一条")).toBeTruthy();
    expect(screen.getByText("无未清账")).toBeTruthy();
    expect(screen.getByText("无阻塞")).toBeTruthy();
  });

  it("uses the local calendar day for early-morning request times", async () => {
    vi.setSystemTime(new Date("2026-05-05T00:30:00+09:00"));

    const project = await seedProject({
      name: "Local Day Project",
      startDate: "2026-05-03",
      endDate: "2026-05-05",
      segmentName: "Phase 1 - Foundations",
    });

    await renderTodayRoute({ project: project.id });

    const timeline = getTimeline();
    const timelineCells = within(timeline).getAllByRole("listitem");

    expect(screen.getAllByText("2026-05-05").length).toBeGreaterThan(0);
    expect(timelineCells[2].getAttribute("aria-current")).toBe("date");
    expect(screen.getByText("Day 3 - Work the plan")).toBeTruthy();
    expect(screen.getByText("Parse yaml")).toBeTruthy();
    expect(screen.getByText("Run integration test")).toBeTruthy();
    expect(screen.queryByText("Inspect schema")).toBeNull();
  });

  it("renders recent knowledge rows instead of the empty state when captures exist", async () => {
    const project = await seedProject({
      name: "Knowledge Feed Project",
      startDate: "2026-05-03",
      endDate: "2026-05-05",
      segmentName: "Phase 1 - Foundations",
    });

    await prisma.knowledgeItem.create({
      data: {
        projectId: project.id,
        type: "bug",
        title: "Parser trims the trailing slash",
        slug: "parser-trims-the-trailing-slash",
        bodyMd: "现象 · 请求被错误归一化",
        tags: ["parser"],
        metadata: {},
        createdAt: new Date("2026-05-05T01:30:00.000Z"),
        updatedAt: new Date("2026-05-05T01:30:00.000Z"),
      },
    });

    await renderTodayRoute({ project: project.id });

    const recentBlock = getBlockByHeading("最近动静");
    expect(within(recentBlock).queryByText("尚未记录 · 用 /knowledge 新建第一条")).toBeNull();
    expect(within(recentBlock).getByText("BUG")).toBeTruthy();
    expect(within(recentBlock).getByText("Parser trims the trailing slash")).toBeTruthy();
    expect(within(recentBlock).getByText("今日")).toBeTruthy();
  });

  it("renders the populated daily-log surfaces when rows exist", async () => {
    const project = await seedProject({
      name: "Populated Daily Log Project",
      startDate: "2026-05-03",
      endDate: "2026-05-05",
      segmentName: "Phase 1 - Foundations",
    });

    await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-05T00:00:00.000Z"),
        whatDone: ["写 action", "补页面"],
        whatSkipped: ["整理 CSS"],
        timeSpentMinutes: 120,
        tomorrowFirstThing: "把测试补全",
        honestyNote: null,
        createdAt: new Date("2026-05-05T01:00:00.000Z"),
        updatedAt: new Date("2026-05-05T01:30:00.000Z"),
      },
    });

    await prisma.dailyLog.create({
      data: {
        projectId: project.id,
        date: new Date("2026-05-04T00:00:00.000Z"),
        whatDone: ["读计划"],
        whatSkipped: [],
        timeSpentMinutes: 60,
        tomorrowFirstThing: "写完 retro plan",
        honestyNote: null,
      },
    });

    await prisma.openItem.createMany({
      data: [
        {
          projectId: project.id,
          text: "跟进 Prisma 错误",
          openedAt: new Date("2026-05-05T00:00:00.000Z"),
          source: "manual",
          status: "open",
        },
        {
          projectId: project.id,
          text: "补充页面文案",
          openedAt: new Date("2026-05-04T00:00:00.000Z"),
          source: "daily_log",
          status: "open",
        },
      ],
    });

    await prisma.blocker.create({
      data: {
        projectId: project.id,
        text: "等待 Prisma 锁问题定位",
        openedAt: new Date("2026-05-05T00:00:00.000Z"),
        resolvedAt: null,
      },
    });

    await renderTodayRoute({ project: project.id });

    expect(screen.getByRole("button", { name: /修改今日/i })).toBeTruthy();

    const promiseBlock = getBlockByHeading("昨日之承诺 · 未结清");
    expect(within(promiseBlock).getByText((content) => content.includes("写完 retro plan"))).toBeTruthy();
    expect(within(promiseBlock).getByText("未兑现")).toBeTruthy();
    expect(within(promiseBlock).queryByRole("button", { name: /记为未清账/i })).toBeNull();

    const openItemsBlock = getBlockByHeading("未清账");
    expect(within(openItemsBlock).getByText("跟进 Prisma 错误")).toBeTruthy();
    expect(within(openItemsBlock).getByText("补充页面文案")).toBeTruthy();

    const blockersBlock = getBlockByHeading("阻塞");
    expect(within(blockersBlock).getByText("等待 Prisma 锁问题定位")).toBeTruthy();
  });

  it("renders the no-project empty state when the database is empty", async () => {
    await renderTodayRoute();

    expect(
      screen.getByText((_, element) => element?.textContent === "还没有项目。跑 npm run seed 导入一个计划。"),
    ).toBeTruthy();
    expect(screen.getByText("还没有项目")).toBeTruthy();
  });

  it("renders sidebar project links newest first and resolves project switching rules", async () => {
    const older = await seedProject({
      name: "Older Project",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
      segmentName: "Older Phase",
    });
    const newer = await seedProject({
      name: "Newer Project",
      startDate: "2026-05-03",
      endDate: "2026-05-07",
      segmentName: "Newer Phase",
    });

    await renderTodayRoute();

    const projectLinks = getProjectLinks();
    expect(projectLinks).toHaveLength(2);
    expect(projectLinks[0].textContent).toBe("Newer Project");
    expect(projectLinks[0].getAttribute("href")).toBe(`/today?project=${newer.id}`);
    expect(projectLinks[1].textContent).toBe("Older Project");
    expect(projectLinks[1].getAttribute("href")).toBe(`/today?project=${older.id}`);
    expect(projectLinks[0].getAttribute("aria-current")).toBe("page");
    expect(projectLinks[1].getAttribute("aria-current")).toBeNull();
    expect(screen.getByText((content) => content.includes("Newer Phase · 第 3 天"))).toBeTruthy();

    await renderTodayRoute({ project: older.id });

    const olderLinks = getProjectLinks();
    expect(olderLinks[0].getAttribute("aria-current")).toBeNull();
    expect(olderLinks[1].getAttribute("aria-current")).toBe("page");
    expect(screen.getByText((content) => content.includes("Older Phase · 第 5 天"))).toBeTruthy();

    await renderTodayRoute({ project: "bogus-project-id" });

    const bogusLinks = getProjectLinks();
    expect(bogusLinks[0].getAttribute("aria-current")).toBe("page");
    expect(bogusLinks[1].getAttribute("aria-current")).toBeNull();
    expect(screen.getByText((content) => content.includes("Newer Phase · 第 3 天"))).toBeTruthy();
  });
});

async function renderTodayRoute(query: Record<string, string> = {}) {
  cleanup();
  currentSearchParams = new URLSearchParams(query);
  currentPathname = "/today";

  const sidebar = await Sidebar();
  const page = await TodayPage({
    searchParams: Promise.resolve(query),
  });

  return render(
    <>
      {sidebar}
      {page}
    </>,
  );
}

function getTimeline() {
  const timeline = screen.getAllByRole("list").find((list) => list.hasAttribute("aria-label"));

  if (!timeline) {
    throw new Error("expected timeline list");
  }

  return timeline;
}

function getProjectLinks() {
  return screen.getAllByRole("link").filter((link) => {
    const href = link.getAttribute("href");
    return href?.startsWith("/today?project=");
  });
}

function getBlockByHeading(heading: string) {
  const label = screen.getByText(heading);
  const section = label.closest("section");

  if (!section) {
    throw new Error(`expected block for ${heading}`);
  }

  return section;
}

async function seedProject({
  name,
  startDate,
  endDate,
  segmentName,
}: {
  name: string;
  startDate: string;
  endDate: string;
  segmentName: string;
}) {
  const project = await prisma.project.create({
    data: {
      name,
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      endDate: new Date(`${endDate}T00:00:00.000Z`),
      hasPlanStructure: "full",
      status: "active",
    },
  });

  const segment = await prisma.planSegment.create({
    data: {
      projectId: project.id,
      order: 1,
      name: segmentName,
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      endDate: new Date(`${endDate}T00:00:00.000Z`),
      goals: ["Stay honest"],
    },
  });

  await prisma.planDay.createMany({
    data: [
      {
        projectId: project.id,
        segmentId: segment.id,
        date: new Date("2026-05-03T00:00:00.000Z"),
        title: "Day 1 - Read the contract",
        plannedTasks: ["Read PRD"],
      },
      {
        projectId: project.id,
        segmentId: segment.id,
        date: new Date("2026-05-04T00:00:00.000Z"),
        title: "Day 2 - Validate the shell",
        plannedTasks: ["Inspect schema"],
      },
      {
        projectId: project.id,
        segmentId: segment.id,
        date: new Date("2026-05-05T00:00:00.000Z"),
        title: "Day 3 - Work the plan",
        plannedTasks: ["Parse yaml", "Run integration test"],
      },
    ],
  });

  return project;
}

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
