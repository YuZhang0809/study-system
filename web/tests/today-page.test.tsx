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
  it("renders the active project shell, timeline, planned tasks, and block empty states", async () => {
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

    expect(screen.getByText("尚未记录 · daily-log-flow 落地后会显示昨日留下的第一件事")).toBeTruthy();
    expect(screen.getByText("尚未记录 · 用 /knowledge 新建第一条")).toBeTruthy();
    expect(screen.getByText("尚未记录 · daily-log-flow 落地后会挂出未结清条目")).toBeTruthy();
    expect(screen.getByText("尚未记录 · 阻塞会在 daily-log-flow / 手动记录时出现")).toBeTruthy();
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
