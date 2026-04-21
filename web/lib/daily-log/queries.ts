import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import { startOfLocalDay } from "../today/driving-seat";

const LIST_LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

type DailyLogQueryPrisma = PrismaClient | Prisma.TransactionClient;

export interface DailyLogRecord {
  id: string;
  projectId: string;
  date: Date;
  whatDone: string[];
  whatSkipped: string[];
  timeSpentMinutes: number;
  tomorrowFirstThing: string;
  honestyNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface YesterdayPromise {
  text: string;
}

export interface OpenItemRecord {
  id: string;
  projectId: string;
  text: string;
  openedAt: Date;
  source: string;
  status: string;
}

export interface BlockerRecord {
  id: string;
  projectId: string;
  text: string;
  openedAt: Date;
  resolvedAt: Date | null;
}

export interface CappedListResult<T> {
  items: T[];
  truncated: boolean;
}

export async function getTodayLog(
  projectId: string,
  today: Date,
  prisma: DailyLogQueryPrisma = getPrismaClient(),
): Promise<DailyLogRecord | null> {
  const row = await prisma.dailyLog.findUnique({
    where: {
      projectId_date: {
        projectId,
        date: startOfLocalDay(today),
      },
    },
    select: {
      id: true,
      projectId: true,
      date: true,
      whatDone: true,
      whatSkipped: true,
      timeSpentMinutes: true,
      tomorrowFirstThing: true,
      honestyNote: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) {
    return null;
  }

  return {
    ...row,
    whatDone: parseStringArray(row.whatDone),
    whatSkipped: parseStringArray(row.whatSkipped),
  };
}

export async function getYesterdayPromise(
  projectId: string,
  today: Date,
  prisma: DailyLogQueryPrisma = getPrismaClient(),
): Promise<YesterdayPromise | null> {
  const row = await prisma.dailyLog.findUnique({
    where: {
      projectId_date: {
        projectId,
        date: getPreviousLocalDay(today),
      },
    },
    select: {
      tomorrowFirstThing: true,
    },
  });

  const text = row?.tomorrowFirstThing.trim() ?? "";
  return text ? { text } : null;
}

export async function listOpenItems(
  projectId: string,
  prisma: DailyLogQueryPrisma = getPrismaClient(),
): Promise<CappedListResult<OpenItemRecord>> {
  const rows = await prisma.openItem.findMany({
    where: {
      projectId,
      status: "open",
    },
    orderBy: {
      openedAt: "desc",
    },
    take: LIST_LIMIT + 1,
    select: {
      id: true,
      projectId: true,
      text: true,
      openedAt: true,
      source: true,
      status: true,
    },
  });

  return {
    items: rows.slice(0, LIST_LIMIT),
    truncated: rows.length > LIST_LIMIT,
  };
}

export async function listActiveBlockers(
  projectId: string,
  prisma: DailyLogQueryPrisma = getPrismaClient(),
): Promise<CappedListResult<BlockerRecord>> {
  const rows = await prisma.blocker.findMany({
    where: {
      projectId,
      resolvedAt: null,
    },
    orderBy: {
      openedAt: "desc",
    },
    take: LIST_LIMIT + 1,
    select: {
      id: true,
      projectId: true,
      text: true,
      openedAt: true,
      resolvedAt: true,
    },
  });

  return {
    items: rows.slice(0, LIST_LIMIT),
    truncated: rows.length > LIST_LIMIT,
  };
}

export async function findCarriedForwardOpenItem(
  projectId: string,
  text: string,
  prisma: DailyLogQueryPrisma = getPrismaClient(),
): Promise<OpenItemRecord | null> {
  const row = await prisma.openItem.findFirst({
    where: {
      projectId,
      text,
      source: "daily_log",
      status: "open",
    },
    orderBy: {
      openedAt: "desc",
    },
    select: {
      id: true,
      projectId: true,
      text: true,
      openedAt: true,
      source: true,
      status: true,
    },
  });

  return row ?? null;
}

export function getPreviousLocalDay(today: Date): Date {
  return new Date(startOfLocalDay(today).getTime() - DAY_MS);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const trimmed = entry.trim();
    return trimmed ? [trimmed] : [];
  });
}
