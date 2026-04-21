import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { createAppPrismaClient } from "../lib/prisma";
import { createKnowledgeItem } from "../lib/knowledge/actions";
import { resolveSlugCollision } from "../lib/knowledge/slug";

const { revalidatePath } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
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
    `tmp-knowledge-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
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
  revalidatePath.mockReset();
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

describe("knowledge creation", () => {
  it("resolves slug collisions against the live database", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Knowledge Collision Project",
        startDate: new Date("2026-05-03T00:00:00.000Z"),
        endDate: new Date("2026-05-07T00:00:00.000Z"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    await prisma.knowledgeItem.createMany({
      data: [
        {
          projectId: project.id,
          type: "learning",
          title: "Prompt Notes",
          slug: "prompt-notes",
          bodyMd: "first",
          tags: [],
          metadata: {},
        },
        {
          projectId: project.id,
          type: "learning",
          title: "Prompt Notes 2",
          slug: "prompt-notes-2",
          bodyMd: "second",
          tags: [],
          metadata: {},
        },
      ],
    });

    await expect(resolveSlugCollision(project.id, "prompt-notes", prisma)).resolves.toBe("prompt-notes-3");
  });

  it("creates knowledge items, appends slug suffixes, and writes one artifact pointer", async () => {
    const project = await prisma.project.create({
      data: {
        name: "Knowledge Action Project",
        startDate: new Date("2026-05-03T00:00:00.000Z"),
        endDate: new Date("2026-05-07T00:00:00.000Z"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    await expect(
      createKnowledgeItem(
        buildFormData({
          projectId: project.id,
          type: "learning",
          title: "Same Title",
          bodyMd: "I thought X.\nActually Y.",
          tags: ["alpha", "beta", "alpha"],
          urlOrPath: "https://github.com/acme/repo/commit/abc123",
        }),
      ),
    ).resolves.toEqual({ ok: true });

    await expect(
      createKnowledgeItem(
        buildFormData({
          projectId: project.id,
          type: "bug",
          title: "Same Title",
          bodyMd: "Phenomenon -> cause -> workaround",
          tags: ["ui"],
          urlOrPath: "screenshots/2026-04-22/bug.png",
        }),
      ),
    ).resolves.toEqual({ ok: true });

    const items = await prisma.knowledgeItem.findMany({
      where: { projectId: project.id },
      orderBy: { slug: "asc" },
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      type: "learning",
      title: "Same Title",
      slug: "same-title",
      tags: ["alpha", "beta"],
      metadata: {},
    });
    expect(items[1]).toMatchObject({
      type: "bug",
      slug: "same-title-2",
    });

    const artifacts = await prisma.artifact.findMany({
      orderBy: { ownerId: "asc" },
    });
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]).toMatchObject({
      ownerType: "knowledge_item",
      kind: "commit",
      urlOrPath: "https://github.com/acme/repo/commit/abc123",
    });
    expect(artifacts[1]).toMatchObject({
      ownerType: "knowledge_item",
      kind: "screenshot",
      urlOrPath: "screenshots/2026-04-22/bug.png",
    });

    expect(revalidatePath).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledWith("/knowledge");
    expect(revalidatePath).toHaveBeenCalledWith("/today");
  });

  it("returns field errors instead of writing when the form is invalid", async () => {
    const result = await createKnowledgeItem(
      buildFormData({
        projectId: "",
        type: "learning",
        title: " ",
        bodyMd: "",
        tags: ["bad tag"],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.projectId).toBeTruthy();
    expect(result.fieldErrors?.title).toBeTruthy();
    expect(result.fieldErrors?.bodyMd).toBeTruthy();
    expect(result.fieldErrors?.tags).toBeTruthy();
    expect(await prisma.knowledgeItem.count()).toBe(0);
    expect(await prisma.artifact.count()).toBe(0);
  });
});

function buildFormData(input: {
  projectId: string;
  type: "learning" | "concept" | "bug" | "prompt";
  title: string;
  bodyMd: string;
  tags: string[];
  urlOrPath?: string;
}): FormData {
  const formData = new FormData();
  formData.set("projectId", input.projectId);
  formData.set("type", input.type);
  formData.set("title", input.title);
  formData.set("bodyMd", input.bodyMd);

  if (input.urlOrPath !== undefined) {
    formData.set("urlOrPath", input.urlOrPath);
  }

  for (const tag of input.tags) {
    formData.append("tags", tag);
  }

  return formData;
}

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
