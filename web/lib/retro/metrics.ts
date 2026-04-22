import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import type { RetroMetricsInput } from "../schemas/retro";
import { formatIsoDate, startOfLocalDay } from "../today/driving-seat";

const DAY_MS = 24 * 60 * 60 * 1000;

type RetroMetricPrisma = PrismaClient | Prisma.TransactionClient;

export interface RetroMetricSegment {
  id: string;
  startDate: Date;
  endDate: Date;
}

export async function computeRetroMetrics(
  projectId: string,
  segment: RetroMetricSegment,
  prisma: RetroMetricPrisma = getPrismaClient(),
): Promise<RetroMetricsInput> {
  const windowStart = startOfLocalDay(segment.startDate);
  const windowEndExclusive = new Date(startOfLocalDay(segment.endDate).getTime() + DAY_MS);

  const [plannedRows, loggedRows, learningCount, bugCount, promptCount, knowledgeRows] = await Promise.all([
    prisma.planDay.findMany({
      where: { segmentId: segment.id },
      select: { date: true },
    }),
    prisma.dailyLog.findMany({
      where: {
        projectId,
        date: {
          gte: windowStart,
          lt: windowEndExclusive,
        },
      },
      select: { date: true },
    }),
    prisma.knowledgeItem.count({
      where: {
        projectId,
        type: "learning",
        createdAt: {
          gte: windowStart,
          lt: windowEndExclusive,
        },
      },
    }),
    prisma.knowledgeItem.count({
      where: {
        projectId,
        type: "bug",
        createdAt: {
          gte: windowStart,
          lt: windowEndExclusive,
        },
      },
    }),
    prisma.knowledgeItem.count({
      where: {
        projectId,
        type: "prompt",
        createdAt: {
          gte: windowStart,
          lt: windowEndExclusive,
        },
      },
    }),
    prisma.knowledgeItem.findMany({
      where: {
        projectId,
        createdAt: {
          gte: windowStart,
          lt: windowEndExclusive,
        },
      },
      select: { id: true },
    }),
  ]);

  const commits = await countCommitArtifacts(knowledgeRows.map((row) => row.id), prisma);

  return {
    commits,
    logs: loggedRows.length,
    learnings: learningCount,
    bugs: bugCount,
    prompts: promptCount,
    planned_days: plannedRows.length,
    drift_days: countDriftDays(plannedRows.map((row) => row.date), loggedRows.map((row) => row.date)),
  };
}

async function countCommitArtifacts(ownerIds: string[], prisma: RetroMetricPrisma): Promise<number> {
  if (ownerIds.length === 0) {
    return 0;
  }

  return prisma.artifact.count({
    where: {
      kind: "commit",
      ownerType: "knowledge_item",
      ownerId: {
        in: ownerIds,
      },
    },
  });
}

export function countDriftDays(plannedDates: Date[], loggedDates: Date[]): number {
  const planned = new Set(plannedDates.map((date) => formatIsoDate(date)));
  const logged = new Set(loggedDates.map((date) => formatIsoDate(date)));

  let driftDays = 0;

  for (const date of planned) {
    if (!logged.has(date)) {
      driftDays += 1;
    }
  }

  return driftDays;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("retro metric helpers", () => {
    it("counts planned days without logs as drift", () => {
      expect(
        countDriftDays(
          [
            new Date("2026-05-01T00:00:00.000Z"),
            new Date("2026-05-02T00:00:00.000Z"),
            new Date("2026-05-03T00:00:00.000Z"),
          ],
          [
            new Date("2026-05-01T09:00:00.000Z"),
            new Date("2026-05-03T09:00:00.000Z"),
            new Date("2026-05-04T09:00:00.000Z"),
          ],
        ),
      ).toBe(1);
    });

    it("normalizes timestamps onto the local day before subtracting", () => {
      expect(
        countDriftDays(
          [new Date("2026-05-01T00:00:00+09:00")],
          [new Date("2026-05-01T23:59:59+09:00")],
        ),
      ).toBe(0);
    });
  });
}
