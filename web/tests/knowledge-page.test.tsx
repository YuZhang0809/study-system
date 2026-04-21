// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import KnowledgePage from "../app/knowledge/page";
import { createAppPrismaClient } from "../lib/prisma";

vi.mock("@/lib/knowledge/actions", () => ({
  createKnowledgeItem: vi.fn(async () => ({ ok: true })),
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
    `tmp-knowledge-page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("/knowledge page", () => {
  it("renders counters, pill links, and all rows for the default filter", async () => {
    const project = await seedProject("Knowledge Page Project");
    await seedKnowledgeMatrix(project.id);

    await renderKnowledgeRoute({ project: project.id });

    expect(screen.getByText("知识库")).toBeTruthy();
    expect(screen.getByText("4 条 · 1 心得 · 1 概念 · 1 缺陷 · 1 提示词")).toBeTruthy();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("href"))).toEqual([
      `/knowledge?project=${project.id}&type=all`,
      `/knowledge?project=${project.id}&type=learning`,
      `/knowledge?project=${project.id}&type=concept`,
      `/knowledge?project=${project.id}&type=bug`,
      `/knowledge?project=${project.id}&type=prompt`,
    ]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");

    expect(screen.getByText("Learning note")).toBeTruthy();
    expect(screen.getByText("Concept note")).toBeTruthy();
    expect(screen.getByText("Bug note")).toBeTruthy();
    expect(screen.getByText("Prompt note")).toBeTruthy();
  });

  it("renders only the requested type rows when the filter is present", async () => {
    const project = await seedProject("Filtered Knowledge Project");
    await seedKnowledgeMatrix(project.id);

    await renderKnowledgeRoute({ project: project.id, type: "learning" });

    const tabs = screen.getAllByRole("tab");
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Learning note")).toBeTruthy();
    expect(screen.queryByText("Concept note")).toBeNull();
    expect(screen.queryByText("Bug note")).toBeNull();
    expect(screen.queryByText("Prompt note")).toBeNull();
  });

  it("renders the empty-row copy when the active project has no matching knowledge rows", async () => {
    const project = await seedProject("Empty Knowledge Project");

    await renderKnowledgeRoute({ project: project.id, type: "learning" });

    expect(screen.getByText("无条目 · 用上面的按钮新建")).toBeTruthy();
  });
});

async function renderKnowledgeRoute(query: Record<string, string> = {}) {
  cleanup();

  const page = await KnowledgePage({
    searchParams: Promise.resolve(query),
  });

  return render(page);
}

async function seedProject(name: string) {
  return prisma.project.create({
    data: {
      name,
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-07T00:00:00.000Z"),
      hasPlanStructure: "full",
      status: "active",
    },
  });
}

async function seedKnowledgeMatrix(projectId: string) {
  await prisma.knowledgeItem.createMany({
    data: [
      {
        projectId,
        type: "learning",
        title: "Learning note",
        slug: "learning-note",
        bodyMd: "I was wrong about the first attempt.",
        tags: ["reflect"],
        metadata: {},
        createdAt: new Date("2026-05-05T03:00:00.000Z"),
        updatedAt: new Date("2026-05-05T03:00:00.000Z"),
      },
      {
        projectId,
        type: "concept",
        title: "Concept note",
        slug: "concept-note",
        bodyMd: "Definition · example · trap",
        tags: ["theory"],
        metadata: {},
        createdAt: new Date("2026-05-04T03:00:00.000Z"),
        updatedAt: new Date("2026-05-04T03:00:00.000Z"),
      },
      {
        projectId,
        type: "bug",
        title: "Bug note",
        slug: "bug-note",
        bodyMd: "Phenomenon · reproduction · workaround",
        tags: ["debug"],
        metadata: {},
        createdAt: new Date("2026-05-03T03:00:00.000Z"),
        updatedAt: new Date("2026-05-03T03:00:00.000Z"),
      },
      {
        projectId,
        type: "prompt",
        title: "Prompt note",
        slug: "prompt-note",
        bodyMd: "Prompt body · use case · warning",
        tags: ["prompt"],
        metadata: {},
        createdAt: new Date("2026-05-02T03:00:00.000Z"),
        updatedAt: new Date("2026-05-02T03:00:00.000Z"),
      },
    ],
  });
}

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
