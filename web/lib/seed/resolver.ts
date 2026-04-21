import type { PlanYaml, PlanYamlDay, PlanYamlProject, PlanYamlSegment } from "./plan-yaml-schema";
import type {
  ExistingDayRecord,
  ExistingProjectRecord,
  ExistingSegmentRecord,
  SeedReaderSnapshot,
} from "./reader";

export type FieldDiff = {
  field: string;
  from: unknown;
  to: unknown;
};

export type SeedAction = "insert" | "update" | "noop";

export type SeedPlan = {
  project: {
    action: SeedAction;
    data: PlanYamlProject;
    diffs: FieldDiff[];
    existingId: string | null;
  };
  segments: Array<{
    action: SeedAction;
    key: { order: number };
    data: PlanYamlSegment;
    diffs: FieldDiff[];
    userImpact: {
      retros: number;
      daysInRange: number;
      daysInRangeWithDailyLogs: number;
    };
    existingId: string | null;
  }>;
  days: Array<{
    action: SeedAction;
    key: { date: string };
    data: PlanYamlDay;
    diffs: FieldDiff[];
    userImpact: { dailyLogs: number };
    existingId: string | null;
  }>;
  orphans: {
    segments: Array<{
      id: string;
      order: number;
      name: string;
      startDate: string;
      endDate: string;
      daysInRangeWithDailyLogs: number;
    }>;
    days: Array<{
      id: string;
      date: string;
      title: string;
      dailyLogs: number;
    }>;
  };
};

export function resolveSeedPlan(plan: PlanYaml, snapshot: SeedReaderSnapshot): SeedPlan {
  assertPlanReferencesKnownSegments(plan);

  const segmentsByOrder = new Map<number, ExistingSegmentRecord>();
  for (const segment of snapshot.segments) {
    segmentsByOrder.set(segment.order, segment);
  }

  const segmentOrderById = new Map<string, number>();
  for (const segment of snapshot.segments) {
    segmentOrderById.set(segment.id, segment.order);
  }

  const daysByDate = new Map<string, ExistingDayRecord>();
  for (const day of snapshot.days) {
    daysByDate.set(formatDateOnly(day.date), day);
  }

  const projectPlan = resolveProjectPlan(plan.project, snapshot.project);
  const segmentPlan = plan.segments
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((segment) => resolveSegmentPlan(segment, segmentsByOrder.get(segment.order) ?? null, snapshot));
  const dayPlan = plan.days
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((day) =>
      resolveDayPlan(
        day,
        daysByDate.get(formatDateOnly(day.date)) ?? null,
        segmentOrderById,
        snapshot,
      ),
    );

  const yamlOrders = new Set(plan.segments.map((segment) => segment.order));
  const yamlDates = new Set(plan.days.map((day) => formatDateOnly(day.date)));

  const orphanSegments = snapshot.segments
    .filter((segment) => !yamlOrders.has(segment.order))
    .map((segment) => ({
      id: segment.id,
      order: segment.order,
      name: segment.name,
      startDate: formatDateOnly(segment.startDate),
      endDate: formatDateOnly(segment.endDate),
      daysInRangeWithDailyLogs: countDailyLogsInRange(
        snapshot.dailyLogsByDate,
        segment.startDate,
        segment.endDate,
      ),
    }))
    .sort((a, b) => a.order - b.order);

  const orphanDays = snapshot.days
    .filter((day) => !yamlDates.has(formatDateOnly(day.date)))
    .map((day) => ({
      id: day.id,
      date: formatDateOnly(day.date),
      title: day.title,
      dailyLogs: snapshot.dailyLogsByDate[formatDateOnly(day.date)] ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    project: projectPlan,
    segments: segmentPlan,
    days: dayPlan,
    orphans: {
      segments: orphanSegments,
      days: orphanDays,
    },
  };
}

function resolveProjectPlan(
  project: PlanYamlProject,
  existing: ExistingProjectRecord | null,
): SeedPlan["project"] {
  if (!existing) {
    return {
      action: "insert",
      data: project,
      diffs: [],
      existingId: null,
    };
  }

  const diffs: FieldDiff[] = [];

  pushDateDiff(diffs, "startDate", existing.startDate, project.startDate);
  pushNullableDateDiff(diffs, "endDate", existing.endDate, project.endDate);
  pushValueDiff(diffs, "hasPlanStructure", existing.hasPlanStructure, project.hasPlanStructure);
  pushValueDiff(diffs, "status", existing.status, project.status);

  const action = diffs.length > 0 ? "update" : "noop";

  return {
    action,
    data: project,
    diffs,
    existingId: existing.id,
  };
}

function resolveSegmentPlan(
  segment: PlanYamlSegment,
  existing: ExistingSegmentRecord | null,
  snapshot: SeedReaderSnapshot,
): SeedPlan["segments"][number] {
  if (!existing) {
    return {
      action: "insert",
      key: { order: segment.order },
      data: segment,
      diffs: [],
      userImpact: {
        retros: 0,
        daysInRange: countDaysInRange(snapshot.days, undefined, undefined, segment.startDate, segment.endDate),
        daysInRangeWithDailyLogs: countDailyLogsInRange(
          snapshot.dailyLogsByDate,
          undefined,
          undefined,
          segment.startDate,
          segment.endDate,
        ),
      },
      existingId: null,
    };
  }

  const diffs: FieldDiff[] = [];
  pushValueDiff(diffs, "name", existing.name, segment.name);
  pushDateDiff(diffs, "startDate", existing.startDate, segment.startDate);
  pushDateDiff(diffs, "endDate", existing.endDate, segment.endDate);
  pushArrayDiff(diffs, "goals", existing.goals, segment.goals);

  const action = diffs.length > 0 ? "update" : "noop";
  assertActionHasDiffs(action, diffs, `segment order=${segment.order}`);

  return {
    action,
    key: { order: segment.order },
    data: segment,
    diffs,
    userImpact: {
      retros: snapshot.retrosBySegmentId[existing.id] ?? 0,
      daysInRange: countDaysInRange(
        snapshot.days,
        existing.startDate,
        existing.endDate,
        segment.startDate,
        segment.endDate,
      ),
      daysInRangeWithDailyLogs: countDailyLogsInRange(
        snapshot.dailyLogsByDate,
        existing.startDate,
        existing.endDate,
        segment.startDate,
        segment.endDate,
      ),
    },
    existingId: existing.id,
  };
}

function resolveDayPlan(
  day: PlanYamlDay,
  existing: ExistingDayRecord | null,
  segmentOrderById: Map<string, number>,
  snapshot: SeedReaderSnapshot,
): SeedPlan["days"][number] {
  const dateKey = formatDateOnly(day.date);

  if (!existing) {
    return {
      action: "insert",
      key: { date: dateKey },
      data: day,
      diffs: [],
      userImpact: {
        dailyLogs: snapshot.dailyLogsByDate[dateKey] ?? 0,
      },
      existingId: null,
    };
  }

  const diffs: FieldDiff[] = [];
  const existingSegmentOrder =
    existing.segmentId === null ? null : (segmentOrderById.get(existing.segmentId) ?? null);

  pushValueDiff(diffs, "segmentOrder", existingSegmentOrder, day.segmentOrder);
  pushValueDiff(diffs, "title", existing.title, day.title);
  pushArrayDiff(diffs, "plannedTasks", existing.plannedTasks, day.plannedTasks);

  const action = diffs.length > 0 ? "update" : "noop";
  assertActionHasDiffs(action, diffs, `day ${dateKey}`);

  return {
    action,
    key: { date: dateKey },
    data: day,
    diffs,
    userImpact: {
      dailyLogs: snapshot.dailyLogsByDate[dateKey] ?? 0,
    },
    existingId: existing.id,
  };
}

function assertPlanReferencesKnownSegments(plan: PlanYaml): void {
  const orders = new Set(plan.segments.map((segment) => segment.order));

  for (const day of plan.days) {
    if (!orders.has(day.segmentOrder)) {
      throw new Error(`day ${formatDateOnly(day.date)} references missing segment_order ${day.segmentOrder}`);
    }
  }
}

function assertActionHasDiffs(action: SeedAction, diffs: FieldDiff[], label: string): void {
  if (action === "update" && diffs.length === 0) {
    throw new Error(`resolver bug: ${label} marked update with no diffs`);
  }
}

function pushValueDiff(diffs: FieldDiff[], field: string, from: unknown, to: unknown): void {
  if (!isEqualValue(from, to)) {
    diffs.push({ field, from, to });
  }
}

function pushArrayDiff(diffs: FieldDiff[], field: string, from: string[], to: string[]): void {
  if (!isEqualValue(from, to)) {
    diffs.push({ field, from, to });
  }
}

function pushDateDiff(diffs: FieldDiff[], field: string, from: Date, to: Date): void {
  const fromValue = formatDateOnly(from);
  const toValue = formatDateOnly(to);
  if (fromValue !== toValue) {
    diffs.push({ field, from: fromValue, to: toValue });
  }
}

function pushNullableDateDiff(
  diffs: FieldDiff[],
  field: string,
  from: Date | null,
  to: Date | null,
): void {
  const fromValue = from ? formatDateOnly(from) : null;
  const toValue = to ? formatDateOnly(to) : null;
  if (fromValue !== toValue) {
    diffs.push({ field, from: fromValue, to: toValue });
  }
}

function countDaysInRange(
  days: ExistingDayRecord[],
  oldStart?: Date,
  oldEnd?: Date,
  newStart?: Date,
  newEnd?: Date,
): number {
  return days.filter((day) => isWithinEitherRange(day.date, oldStart, oldEnd, newStart, newEnd)).length;
}

function countDailyLogsInRange(
  dailyLogsByDate: Record<string, number>,
  oldStart?: Date,
  oldEnd?: Date,
  newStart?: Date,
  newEnd?: Date,
): number {
  return Object.entries(dailyLogsByDate).reduce((total, [dateKey, count]) => {
    if (count <= 0) {
      return total;
    }

    return isWithinEitherRange(parseDateOnly(dateKey), oldStart, oldEnd, newStart, newEnd)
      ? total + count
      : total;
  }, 0);
}

function isWithinEitherRange(
  date: Date,
  oldStart?: Date,
  oldEnd?: Date,
  newStart?: Date,
  newEnd?: Date,
): boolean {
  const inOld = oldStart && oldEnd ? isWithinRange(date, oldStart, oldEnd) : false;
  const inNew = newStart && newEnd ? isWithinRange(date, newStart, newEnd) : false;
  return inOld || inNew;
}

function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function isEqualValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  function makePlan(): PlanYaml {
    return {
      project: {
        name: "90 Day Agentic AI Product Builder",
        startDate: new Date("2026-05-03"),
        endDate: new Date("2026-05-07"),
        hasPlanStructure: "full",
        status: "active",
      },
      segments: [
        {
          order: 1,
          name: "Phase 1",
          startDate: new Date("2026-05-03"),
          endDate: new Date("2026-05-05"),
          goals: ["Ship scaffold"],
        },
        {
          order: 2,
          name: "Phase 2",
          startDate: new Date("2026-05-06"),
          endDate: new Date("2026-05-07"),
          goals: ["Land seed cli"],
        },
      ],
      days: [
        {
          date: new Date("2026-05-03"),
          segmentOrder: 1,
          title: "Day 1",
          plannedTasks: ["Read PRD"],
        },
        {
          date: new Date("2026-05-04"),
          segmentOrder: 1,
          title: "Day 2",
          plannedTasks: ["Write code"],
        },
      ],
    };
  }

  function makeSnapshot(): SeedReaderSnapshot {
    return {
      project: null,
      segments: [],
      days: [],
      dailyLogsByDate: {},
      retrosBySegmentId: {},
    };
  }

  describe("resolveSeedPlan", () => {
    it("marks every row as an insert on the first run", () => {
      const resolved = resolveSeedPlan(makePlan(), makeSnapshot());
      expect(resolved.project.action).toBe("insert");
      expect(resolved.segments.every((segment) => segment.action === "insert")).toBe(true);
      expect(resolved.days.every((day) => day.action === "insert")).toBe(true);
      expect(resolved.orphans.segments).toEqual([]);
      expect(resolved.orphans.days).toEqual([]);
    });

    it("returns noops when the yaml matches the db snapshot", () => {
      const plan = makePlan();
      const resolved = resolveSeedPlan(plan, {
        project: {
          id: "project-1",
          name: plan.project.name,
          startDate: plan.project.startDate,
          endDate: plan.project.endDate,
          hasPlanStructure: plan.project.hasPlanStructure,
          status: plan.project.status,
        },
        segments: [
          {
            id: "segment-1",
            projectId: "project-1",
            order: 1,
            name: "Phase 1",
            startDate: new Date("2026-05-03"),
            endDate: new Date("2026-05-05"),
            goals: ["Ship scaffold"],
          },
          {
            id: "segment-2",
            projectId: "project-1",
            order: 2,
            name: "Phase 2",
            startDate: new Date("2026-05-06"),
            endDate: new Date("2026-05-07"),
            goals: ["Land seed cli"],
          },
        ],
        days: [
          {
            id: "day-1",
            projectId: "project-1",
            segmentId: "segment-1",
            date: new Date("2026-05-03"),
            title: "Day 1",
            plannedTasks: ["Read PRD"],
          },
          {
            id: "day-2",
            projectId: "project-1",
            segmentId: "segment-1",
            date: new Date("2026-05-04"),
            title: "Day 2",
            plannedTasks: ["Write code"],
          },
        ],
        dailyLogsByDate: {},
        retrosBySegmentId: {},
      });

      expect(resolved.project.action).toBe("noop");
      expect(resolved.segments.every((segment) => segment.action === "noop")).toBe(true);
      expect(resolved.days.every((day) => day.action === "noop")).toBe(true);
    });

    it("marks edited segments as updates and reports blast radius", () => {
      const plan = makePlan();
      plan.segments[0] = {
        ...plan.segments[0],
        name: "Phase 1 renamed",
        endDate: new Date("2026-05-06"),
      };

      const resolved = resolveSeedPlan(plan, {
        project: {
          id: "project-1",
          name: plan.project.name,
          startDate: plan.project.startDate,
          endDate: plan.project.endDate,
          hasPlanStructure: plan.project.hasPlanStructure,
          status: plan.project.status,
        },
        segments: [
          {
            id: "segment-1",
            projectId: "project-1",
            order: 1,
            name: "Phase 1",
            startDate: new Date("2026-05-03"),
            endDate: new Date("2026-05-05"),
            goals: ["Ship scaffold"],
          },
        ],
        days: [
          {
            id: "day-1",
            projectId: "project-1",
            segmentId: "segment-1",
            date: new Date("2026-05-03"),
            title: "Day 1",
            plannedTasks: ["Read PRD"],
          },
          {
            id: "day-2",
            projectId: "project-1",
            segmentId: "segment-1",
            date: new Date("2026-05-06"),
            title: "Day moved",
            plannedTasks: ["Write code"],
          },
        ],
        dailyLogsByDate: {
          "2026-05-03": 1,
          "2026-05-06": 1,
        },
        retrosBySegmentId: {
          "segment-1": 1,
        },
      });

      expect(resolved.segments[0].action).toBe("update");
      expect(resolved.segments[0].diffs).toEqual(
        expect.arrayContaining([
          { field: "name", from: "Phase 1", to: "Phase 1 renamed" },
          { field: "endDate", from: "2026-05-05", to: "2026-05-06" },
        ]),
      );
      expect(resolved.segments[0].userImpact).toEqual({
        retros: 1,
        daysInRange: 2,
        daysInRangeWithDailyLogs: 2,
      });
    });

    it("detects added days and orphaned removed days", () => {
      const plan = makePlan();
      plan.days.push({
        date: new Date("2026-05-05"),
        segmentOrder: 1,
        title: "Day 3",
        plannedTasks: ["Ship test"],
      });

      const resolved = resolveSeedPlan(plan, {
        project: {
          id: "project-1",
          name: plan.project.name,
          startDate: plan.project.startDate,
          endDate: plan.project.endDate,
          hasPlanStructure: plan.project.hasPlanStructure,
          status: plan.project.status,
        },
        segments: [
          {
            id: "segment-1",
            projectId: "project-1",
            order: 1,
            name: "Phase 1",
            startDate: new Date("2026-05-03"),
            endDate: new Date("2026-05-05"),
            goals: ["Ship scaffold"],
          },
          {
            id: "segment-2",
            projectId: "project-1",
            order: 2,
            name: "Phase 2",
            startDate: new Date("2026-05-06"),
            endDate: new Date("2026-05-07"),
            goals: ["Land seed cli"],
          },
        ],
        days: [
          {
            id: "day-1",
            projectId: "project-1",
            segmentId: "segment-1",
            date: new Date("2026-05-03"),
            title: "Day 1",
            plannedTasks: ["Read PRD"],
          },
          {
            id: "day-removed",
            projectId: "project-1",
            segmentId: "segment-2",
            date: new Date("2026-05-07"),
            title: "Old orphan",
            plannedTasks: ["Remove me"],
          },
        ],
        dailyLogsByDate: {
          "2026-05-07": 1,
        },
        retrosBySegmentId: {},
      });

      expect(resolved.days.find((day) => day.key.date === "2026-05-05")?.action).toBe("insert");
      expect(resolved.orphans.days).toEqual([
        {
          id: "day-removed",
          date: "2026-05-07",
          title: "Old orphan",
          dailyLogs: 1,
        },
      ]);
    });

    it("throws if a day references a missing segment order", () => {
      const plan = makePlan();
      plan.days[0] = {
        ...plan.days[0],
        segmentOrder: 999,
      };

      expect(() => resolveSeedPlan(plan, makeSnapshot())).toThrow(/missing segment_order 999/);
    });

    it("counts daily logs in shifted segment ranges even without plan_day rows", () => {
      const plan = makePlan();
      plan.segments[0] = {
        ...plan.segments[0],
        endDate: new Date("2026-05-05"),
      };

      const resolved = resolveSeedPlan(plan, {
        project: {
          id: "project-1",
          name: plan.project.name,
          startDate: plan.project.startDate,
          endDate: plan.project.endDate,
          hasPlanStructure: plan.project.hasPlanStructure,
          status: plan.project.status,
        },
        segments: [
          {
            id: "segment-1",
            projectId: "project-1",
            order: 1,
            name: "Phase 1",
            startDate: new Date("2026-05-03"),
            endDate: new Date("2026-05-04"),
            goals: ["Ship scaffold"],
          },
        ],
        days: [],
        dailyLogsByDate: {
          "2026-05-05": 1,
        },
        retrosBySegmentId: {},
      });

      expect(resolved.segments[0].userImpact).toEqual({
        retros: 0,
        daysInRange: 0,
        daysInRangeWithDailyLogs: 1,
      });
    });
  });
}
