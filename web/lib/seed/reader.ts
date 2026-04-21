import type { PrismaClient } from "@prisma/client";
import { SeedError } from "./error";

export type ExistingProjectRecord = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  hasPlanStructure: string;
  status: string;
};

export type ExistingSegmentRecord = {
  id: string;
  projectId: string;
  order: number;
  name: string;
  startDate: Date;
  endDate: Date;
  goals: string[];
};

export type ExistingDayRecord = {
  id: string;
  projectId: string;
  segmentId: string | null;
  date: Date;
  title: string;
  plannedTasks: string[];
};

export type SeedReaderSnapshot = {
  project: ExistingProjectRecord | null;
  segments: ExistingSegmentRecord[];
  days: ExistingDayRecord[];
  dailyLogsByDate: Record<string, number>;
  retrosBySegmentId: Record<string, number>;
};

export async function readSeedSnapshot(
  prisma: PrismaClient,
  projectName: string,
): Promise<SeedReaderSnapshot> {
  const matchingProjects = await prisma.project.findMany({
    where: { name: projectName },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      hasPlanStructure: true,
      status: true,
    },
  });

  if (matchingProjects.length > 1) {
    throw new SeedError(4, `project name conflict: ${projectName}`, [
      `found ${matchingProjects.length} projects with the same name`,
    ]);
  }

  if (matchingProjects.length === 0) {
    return {
      project: null,
      segments: [],
      days: [],
      dailyLogsByDate: {},
      retrosBySegmentId: {},
    };
  }

  const project = matchingProjects[0];
  const [segments, days, dailyLogs, retros] = await Promise.all([
    prisma.planSegment.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        projectId: true,
        order: true,
        name: true,
        startDate: true,
        endDate: true,
        goals: true,
      },
    }),
    prisma.planDay.findMany({
      where: { projectId: project.id },
      orderBy: { date: "asc" },
      select: {
        id: true,
        projectId: true,
        segmentId: true,
        date: true,
        title: true,
        plannedTasks: true,
      },
    }),
    prisma.dailyLog.groupBy({
      by: ["date"],
      where: { projectId: project.id },
      _count: { _all: true },
    }),
    prisma.retro.groupBy({
      by: ["segmentId"],
      where: { segment: { projectId: project.id } },
      _count: { _all: true },
    }),
  ]);

  const segmentOrderMap = new Map<number, string>();
  for (const segment of segments) {
    if (segmentOrderMap.has(segment.order)) {
      throw new SeedError(4, `segment order conflict in project: ${projectName}`, [
        `multiple plan_segment rows found for order=${segment.order}`,
      ]);
    }
    segmentOrderMap.set(segment.order, segment.id);
  }

  const knownSegmentIds = new Set(segments.map((segment) => segment.id));
  for (const day of days) {
    if (day.segmentId !== null && !knownSegmentIds.has(day.segmentId)) {
      throw new SeedError(4, `plan day references missing segment in project: ${projectName}`, [
        `plan_day ${formatDateOnly(day.date)} points to segmentId=${day.segmentId}`,
      ]);
    }
  }

  return {
    project,
    segments: segments.map((segment) => ({
      ...segment,
      goals: coerceStringArray(segment.goals, `plan_segment order=${segment.order} goals`),
    })),
    days: days.map((day) => ({
      ...day,
      plannedTasks: coerceStringArray(day.plannedTasks, `plan_day ${formatDateOnly(day.date)} plannedTasks`),
    })),
    dailyLogsByDate: Object.fromEntries(
      dailyLogs.map((row) => [formatDateOnly(row.date), row._count._all]),
    ),
    retrosBySegmentId: Object.fromEntries(
      retros.map((row) => [row.segmentId, row._count._all]),
    ),
  };
}

function coerceStringArray(value: unknown, label: string): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  throw new SeedError(4, `invalid stored json for ${label}`, []);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
