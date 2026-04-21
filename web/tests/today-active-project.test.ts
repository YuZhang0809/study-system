import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { createAppPrismaClient } from "../lib/prisma";
import { listSidebarProjects, resolveActiveProject } from "../lib/today/active-project";

const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");

let dbPath: string;
let prisma: PrismaClient;

beforeEach(async () => {
  dbPath = path.resolve(
    __dirname,
    "..",
    "prisma",
    `tmp-today-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
  );

  const raw = new Database(dbPath);
  for (const sql of readAllMigrationSql()) {
    raw.exec(sql);
  }
  raw.close();

  prisma = createAppPrismaClient(`file:${dbPath}`);
});

afterEach(async () => {
  await prisma.$disconnect();
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
});

describe("today active project resolution", () => {
  it("returns null when the database has no projects", async () => {
    await expect(resolveActiveProject(undefined, prisma)).resolves.toBeNull();
    await expect(listSidebarProjects(prisma)).resolves.toEqual([]);
  });

  it("falls back to the most recently started project when no id is requested", async () => {
    const older = await prisma.project.create({
      data: {
        name: "Older Project",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-03T00:00:00.000Z"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    const newer = await prisma.project.create({
      data: {
        name: "Newer Project",
        startDate: new Date("2026-05-03T00:00:00.000Z"),
        endDate: new Date("2026-05-07T00:00:00.000Z"),
        hasPlanStructure: "segments_only",
        status: "active",
      },
    });

    const resolved = await resolveActiveProject(undefined, prisma);
    expect(resolved?.id).toBe(newer.id);

    const sidebarProjects = await listSidebarProjects(prisma);
    expect(sidebarProjects).toEqual([
      { id: newer.id, name: "Newer Project" },
      { id: older.id, name: "Older Project" },
    ]);
  });

  it("returns the requested project when the id exists", async () => {
    const requested = await prisma.project.create({
      data: {
        name: "Requested Project",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-04T00:00:00.000Z"),
        hasPlanStructure: "open",
        status: "active",
      },
    });

    await prisma.planSegment.create({
      data: {
        projectId: requested.id,
        order: 1,
        name: "Requested Segment",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-04T00:00:00.000Z"),
        goals: ["Stay structured"],
      },
    });

    const fallback = await prisma.project.create({
      data: {
        name: "Fallback Project",
        startDate: new Date("2026-05-03T00:00:00.000Z"),
        endDate: new Date("2026-05-07T00:00:00.000Z"),
        hasPlanStructure: "full",
        status: "active",
      },
    });

    const resolved = await resolveActiveProject(requested.id, prisma);
    expect(resolved?.id).toBe(requested.id);
    expect(resolved?.segments.map((segment) => segment.name)).toEqual(["Requested Segment"]);
    expect(fallback.id).toBeTruthy();
  });

  it("falls back to the most recent project when the requested id is bogus", async () => {
    await prisma.project.create({
      data: {
        name: "Older Project",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-03T00:00:00.000Z"),
        hasPlanStructure: "segments_only",
        status: "active",
      },
    });

    const newer = await prisma.project.create({
      data: {
        name: "Newest Project",
        startDate: new Date("2026-05-04T00:00:00.000Z"),
        endDate: null,
        hasPlanStructure: "open",
        status: "active",
      },
    });

    const resolved = await resolveActiveProject("bogus-project-id", prisma);
    expect(resolved?.id).toBe(newer.id);
  });
});

function readAllMigrationSql(): string[] {
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((dir) => readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
