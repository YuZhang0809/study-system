import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { listKnowledgeForProject } from "../lib/knowledge/queries";
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
    `tmp-knowledge-list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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

describe("listKnowledgeForProject", () => {
  it("returns mixed types in newest-first order and includes artifact counts", async () => {
    const project = await seedProject("Knowledge Query Project");
    const newest = await seedKnowledgeItem({
      projectId: project.id,
      type: "learning",
      title: "Newest learning",
      slug: "newest-learning",
      bodyMd: "first line\nsecond line",
      tags: ["alpha", "beta"],
      createdAt: new Date("2026-05-05T03:00:00.000Z"),
    });
    await seedKnowledgeItem({
      projectId: project.id,
      type: "concept",
      title: "Middle concept",
      slug: "middle-concept",
      bodyMd: "concept summary",
      tags: ["schema"],
      createdAt: new Date("2026-05-04T03:00:00.000Z"),
    });
    await seedKnowledgeItem({
      projectId: project.id,
      type: "bug",
      title: "Oldest bug",
      slug: "oldest-bug",
      bodyMd: "bug summary",
      tags: ["parser"],
      createdAt: new Date("2026-05-03T03:00:00.000Z"),
    });

    await prisma.artifact.createMany({
      data: [
        {
          ownerType: "knowledge_item",
          ownerId: newest.id,
          kind: "commit",
          urlOrPath: "https://github.com/acme/repo/commit/abc123",
        },
        {
          ownerType: "knowledge_item",
          ownerId: newest.id,
          kind: "link",
          urlOrPath: "https://example.com/note",
        },
      ],
    });

    const allItems = await listKnowledgeForProject(project.id, "all", prisma);
    expect(allItems.truncated).toBe(false);
    expect(allItems.items.map((item) => item.title)).toEqual([
      "Newest learning",
      "Middle concept",
      "Oldest bug",
    ]);
    expect(allItems.items[0]).toMatchObject({
      type: "learning",
      excerpt: "first line",
      tags: ["alpha", "beta"],
      artifactCount: 2,
    });

    const bugItems = await listKnowledgeForProject(project.id, "bug", prisma);
    expect(bugItems.truncated).toBe(false);
    expect(bugItems.items).toHaveLength(1);
    expect(bugItems.items[0]).toMatchObject({
      type: "bug",
      title: "Oldest bug",
      artifactCount: 0,
    });
  });

  it("caps the list at 200 most recent rows", async () => {
    const project = await seedProject("Knowledge Cap Project");
    const baseTime = Date.parse("2026-05-01T00:00:00.000Z");

    await prisma.knowledgeItem.createMany({
      data: Array.from({ length: 205 }, (_, index) => {
        const stamp = new Date(baseTime + index * 60_000);

        return {
          projectId: project.id,
          type: index % 2 === 0 ? "learning" : "prompt",
          title: `Item ${index}`,
          slug: `item-${index}`,
          bodyMd: `Body ${index}`,
          tags: [index % 2 === 0 ? "learning" : "prompt"],
          metadata: {},
          createdAt: stamp,
          updatedAt: stamp,
        };
      }),
    });

    const result = await listKnowledgeForProject(project.id, "all", prisma);
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(200);
    expect(result.items[0].title).toBe("Item 204");
    expect(result.items.at(-1)?.title).toBe("Item 5");
    expect(result.items.some((item) => item.title === "Item 4")).toBe(false);
  });
});

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

async function seedKnowledgeItem(input: {
  projectId: string;
  type: "learning" | "concept" | "bug" | "prompt";
  title: string;
  slug: string;
  bodyMd: string;
  tags: string[];
  createdAt: Date;
}) {
  return prisma.knowledgeItem.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      slug: input.slug,
      bodyMd: input.bodyMd,
      tags: input.tags,
      metadata: {},
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
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
