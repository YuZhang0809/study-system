import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import {
  retroMetrics,
  retroScopeChanges,
  retroSelfScores,
  retroThreeQuestions,
  type RetroMetricsInput,
  type RetroScopeChangesInput,
  type RetroSelfScoresInput,
  type RetroThreeQuestionsInput,
} from "../schemas/retro";

type RetroQueryPrisma = PrismaClient | Prisma.TransactionClient;

export interface RetroSegmentSnapshot {
  id: string;
  projectId: string;
  order: number;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface RetroRecord {
  id: string;
  segmentId: string;
  metrics: RetroMetricsInput;
  selfScores: RetroSelfScoresInput;
  threeQuestions: RetroThreeQuestionsInput;
  scopeChanges: RetroScopeChangesInput;
  nextPhaseFirstThing: string | null;
  createdAt: Date;
  updatedAt: Date;
  segment: RetroSegmentSnapshot;
}

export async function getRetroBySegmentId(
  segmentId: string,
  prisma: RetroQueryPrisma = getPrismaClient(),
): Promise<RetroRecord | null> {
  const row = await prisma.retro.findUnique({
    where: { segmentId },
    select: retroSelect,
  });

  if (!row) {
    return null;
  }

  return parseRetro(row);
}

export async function listRetrosForProject(
  projectId: string,
  prisma: RetroQueryPrisma = getPrismaClient(),
): Promise<RetroRecord[]> {
  const rows = await prisma.retro.findMany({
    where: {
      segment: {
        projectId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: retroSelect,
  });

  return rows.map(parseRetro);
}

const retroSelect = {
  id: true,
  segmentId: true,
  metrics: true,
  selfScores: true,
  threeQuestions: true,
  scopeChanges: true,
  nextPhaseFirstThing: true,
  createdAt: true,
  updatedAt: true,
  segment: {
    select: {
      id: true,
      projectId: true,
      order: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  },
} satisfies Prisma.RetroSelect;

function parseRetro(row: {
  id: string;
  segmentId: string;
  metrics: Prisma.JsonValue;
  selfScores: Prisma.JsonValue;
  threeQuestions: Prisma.JsonValue;
  scopeChanges: Prisma.JsonValue;
  nextPhaseFirstThing: string | null;
  createdAt: Date;
  updatedAt: Date;
  segment: RetroSegmentSnapshot;
}): RetroRecord {
  return {
    id: row.id,
    segmentId: row.segmentId,
    metrics: retroMetrics.parse(row.metrics),
    selfScores: retroSelfScores.parse(row.selfScores),
    threeQuestions: retroThreeQuestions.parse(row.threeQuestions),
    scopeChanges: retroScopeChanges.parse(row.scopeChanges),
    nextPhaseFirstThing: row.nextPhaseFirstThing,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    segment: row.segment,
  };
}
