import type { PrismaClient, Prisma } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import type { WeeklyLogReflectionsInput, WeeklyLogSelfScoresInput } from "../schemas/weekly-log";
import { startOfLocalDay } from "../today/driving-seat";

type WeeklyLogQueryPrisma = PrismaClient | Prisma.TransactionClient;

export interface WeeklyLogRecord {
  id: string;
  projectId: string;
  weekStart: Date;
  reflections: WeeklyLogReflectionsInput;
  selfScores: WeeklyLogSelfScoresInput;
  createdAt: Date;
  updatedAt: Date;
}

export async function getWeeklyLog(
  projectId: string,
  weekStart: Date,
  prisma: WeeklyLogQueryPrisma = getPrismaClient(),
): Promise<WeeklyLogRecord | null> {
  const row = await prisma.weeklyLog.findUnique({
    where: {
      projectId_weekStart: {
        projectId,
        weekStart: startOfLocalDay(weekStart),
      },
    },
    select: {
      id: true,
      projectId: true,
      weekStart: true,
      reflections: true,
      selfScores: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) {
    return null;
  }

  return parseWeeklyLog(row);
}

export async function listWeeklyLogs(
  projectId: string,
  prisma: WeeklyLogQueryPrisma = getPrismaClient(),
): Promise<WeeklyLogRecord[]> {
  const rows = await prisma.weeklyLog.findMany({
    where: { projectId },
    orderBy: {
      weekStart: "desc",
    },
    select: {
      id: true,
      projectId: true,
      weekStart: true,
      reflections: true,
      selfScores: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return rows.map(parseWeeklyLog);
}

export async function getPreviousWeekLog(
  projectId: string,
  thisWeekStart: Date,
  prisma: WeeklyLogQueryPrisma = getPrismaClient(),
): Promise<WeeklyLogRecord | null> {
  const previousWeekStart = new Date(startOfLocalDay(thisWeekStart).getTime() - 7 * 24 * 60 * 60 * 1000);

  return getWeeklyLog(projectId, previousWeekStart, prisma);
}

function parseWeeklyLog(row: {
  id: string;
  projectId: string;
  weekStart: Date;
  reflections: Prisma.JsonValue;
  selfScores: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): WeeklyLogRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    weekStart: row.weekStart,
    reflections: parseReflections(row.reflections),
    selfScores: parseSelfScores(row.selfScores),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseReflections(value: Prisma.JsonValue): WeeklyLogReflectionsInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" };
  }

  const objectValue = value as Record<string, Prisma.JsonValue>;

  return {
    q1: getStringValue(objectValue, "q1"),
    q2: getStringValue(objectValue, "q2"),
    q3: getStringValue(objectValue, "q3"),
    q4: getStringValue(objectValue, "q4"),
    q5: getStringValue(objectValue, "q5"),
    q6: getStringValue(objectValue, "q6"),
  };
}

function parseSelfScores(value: Prisma.JsonValue): WeeklyLogSelfScoresInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const objectValue = value as Record<string, Prisma.JsonValue>;

  return Object.fromEntries(
    Object.entries(objectValue).flatMap(([key, score]) => {
      if (typeof score !== "number") {
        return [];
      }

      return [[key, score]];
    }),
  );
}

function getStringValue(value: Record<string, Prisma.JsonValue>, key: string): string {
  const entry = value[key];
  return typeof entry === "string" ? entry : "";
}
