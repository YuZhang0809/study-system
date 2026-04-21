import { LineCounter, parseDocument } from "yaml";
import { z } from "zod";
import {
  planDayCreate,
  planSegmentCreate,
  projectCreate,
  projectStatus,
} from "../schemas";
import { SeedError } from "./error";

const yamlHasPlanStructure = z.enum(["full", "segments", "open"]);

const rawProjectSchema = z.object({
  name: projectCreate.shape.name,
  start_date: projectCreate.shape.startDate,
  end_date: projectCreate.shape.endDate.default(null),
  has_plan_structure: yamlHasPlanStructure,
  status: projectStatus.default("active"),
});

const rawSegmentSchema = z.object({
  order: planSegmentCreate.shape.order,
  name: planSegmentCreate.shape.name,
  start_date: planSegmentCreate.shape.startDate,
  end_date: planSegmentCreate.shape.endDate,
  goals: planSegmentCreate.shape.goals,
});

const rawDaySchema = z.object({
  date: planDayCreate.shape.date,
  segment_order: planSegmentCreate.shape.order,
  title: planDayCreate.shape.title,
  planned_tasks: planDayCreate.shape.plannedTasks,
});

const rawPlanYamlSchema = z
  .object({
    project: rawProjectSchema,
    segments: z.array(rawSegmentSchema).optional(),
    days: z.array(rawDaySchema).optional(),
  })
  .superRefine((value, ctx) => {
    const segmentOrders = new Map<number, number>();
    const dayDates = new Map<string, number>();
    const { project, segments, days } = value;

    if (project.has_plan_structure === "open") {
      if ((segments?.length ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["segments"],
          message: "segments must be absent or empty when has_plan_structure is open",
        });
      }

      if ((days?.length ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days"],
          message: "days must be absent or empty when has_plan_structure is open",
        });
      }
    }

    if (project.has_plan_structure === "segments") {
      if (!segments) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["segments"],
          message: "segments is required when has_plan_structure is segments",
        });
      }

      if ((days?.length ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days"],
          message: "days must be absent or empty when has_plan_structure is segments",
        });
      }
    }

    if (project.has_plan_structure === "full") {
      if (!segments) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["segments"],
          message: "segments is required when has_plan_structure is full",
        });
      }

      if (!days) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days"],
          message: "days is required when has_plan_structure is full",
        });
      }
    }

    for (const [index, segment] of (segments ?? []).entries()) {
      const priorIndex = segmentOrders.get(segment.order);
      if (priorIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["segments", index, "order"],
          message: `segment order ${segment.order} duplicates segments[${priorIndex}].order`,
        });
      } else {
        segmentOrders.set(segment.order, index);
      }
    }

    for (const [index, day] of (days ?? []).entries()) {
      const dateKey = formatDateOnly(day.date);
      const priorIndex = dayDates.get(dateKey);

      if (priorIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", index, "date"],
          message: `day date ${dateKey} duplicates days[${priorIndex}].date`,
        });
      } else {
        dayDates.set(dateKey, index);
      }

      if (day.date.getTime() < project.start_date.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", index, "date"],
          message: `day date ${dateKey} is before project.start_date`,
        });
      }

      if (project.end_date !== null && day.date.getTime() > project.end_date.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", index, "date"],
          message: `day date ${dateKey} is after project.end_date`,
        });
      }

      if ((segments?.length ?? 0) > 0 && !segmentOrders.has(day.segment_order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["days", index, "segment_order"],
          message: `segment_order ${day.segment_order} does not match any segment.order`,
        });
      }
    }
  });

export const planYamlSchema = rawPlanYamlSchema.transform(({ project, segments, days }) => ({
  project: {
    name: project.name,
    startDate: project.start_date,
    endDate: project.end_date,
    hasPlanStructure: mapYamlPlanStructure(project.has_plan_structure),
    status: project.status,
  },
  segments: (segments ?? []).map((segment) => ({
    order: segment.order,
    name: segment.name,
    startDate: segment.start_date,
    endDate: segment.end_date,
    goals: segment.goals,
  })),
  days: (days ?? []).map((day) => ({
    date: day.date,
    segmentOrder: day.segment_order,
    title: day.title,
    plannedTasks: day.planned_tasks,
  })),
}));

export type PlanYaml = z.infer<typeof planYamlSchema>;
export type PlanYamlProject = PlanYaml["project"];
export type PlanYamlSegment = PlanYaml["segments"][number];
export type PlanYamlDay = PlanYaml["days"][number];

export function parsePlanYamlSource(source: string, sourceLabel: string): PlanYaml {
  const lineCounter = new LineCounter();
  const document = parseDocument(source, {
    lineCounter,
    prettyErrors: true,
    strict: true,
  });

  if (document.errors.length > 0) {
    const error = document.errors[0];
    const detail = formatYamlParseDetail(sourceLabel, error.linePos?.[0]);

    throw new SeedError(1, `yaml parse error in ${sourceLabel}`, [detail, error.message], error);
  }

  const parsed = planYamlSchema.safeParse(document.toJS());
  if (!parsed.success) {
    throw new SeedError(
      2,
      `yaml validation failed in ${sourceLabel}`,
      parsed.error.issues.map(formatValidationIssue),
      parsed.error,
    );
  }

  return parsed.data;
}

function mapYamlPlanStructure(value: z.infer<typeof yamlHasPlanStructure>) {
  return value === "segments" ? "segments_only" : value;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatYamlParseDetail(
  sourceLabel: string,
  linePos?: { line: number; col: number },
): string {
  if (!linePos) {
    return `at ${sourceLabel}`;
  }

  return `at ${sourceLabel}:${linePos.line}:${linePos.col}`;
}

function formatValidationIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
  return `${path}: ${issue.message}`;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  function expectSeedError(
    action: () => void,
    messagePattern: RegExp,
    detailPattern: RegExp,
  ): void {
    try {
      action();
      throw new Error("expected SeedError");
    } catch (error) {
      expect(error).toBeInstanceOf(SeedError);
      const seedError = error as SeedError;
      expect(seedError.message).toMatch(messagePattern);
      expect(seedError.details.some((detail) => detailPattern.test(detail))).toBe(true);
    }
  }

  describe("planYamlSchema", () => {
    const validFullPlan = `
project:
  name: "90 Day Agentic AI Product Builder"
  start_date: 2026-05-03
  end_date: 2026-05-07
  has_plan_structure: full
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-05
    goals:
      - "Ship scaffold"
  - order: 2
    name: "Phase 2"
    start_date: 2026-05-06
    end_date: 2026-05-07
    goals: []
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1"
    planned_tasks:
      - "Read PRD"
  - date: 2026-05-06
    segment_order: 2
    title: "Day 4"
    planned_tasks:
      - "Test seed cli"
`;

    it("parses a well-formed full yaml and maps segments to the db enum", () => {
      const parsed = parsePlanYamlSource(validFullPlan, "valid.yaml");
      expect(parsed.project.name).toBe("90 Day Agentic AI Product Builder");
      expect(parsed.project.hasPlanStructure).toBe("full");
      expect(parsed.project.status).toBe("active");
      expect(parsed.segments).toHaveLength(2);
      expect(parsed.days[0].segmentOrder).toBe(1);
    });

    it("maps yaml segments to segments_only for the db layer", () => {
      const parsed = parsePlanYamlSource(
        `
project:
  name: "Segments only"
  start_date: 2026-05-03
  has_plan_structure: segments
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-05
    goals: []
`,
        "segments.yaml",
      );
      expect(parsed.project.hasPlanStructure).toBe("segments_only");
      expect(parsed.days).toEqual([]);
    });

    it("rejects duplicate segment orders", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Dup orders"
  start_date: 2026-05-03
  has_plan_structure: segments
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals: []
  - order: 1
    name: "Phase 2"
    start_date: 2026-05-05
    end_date: 2026-05-06
    goals: []
`,
          "dup-segment.yaml",
        ),
        /yaml validation failed in dup-segment\.yaml/,
        /segment order 1 duplicates/,
      );
    });

    it("rejects duplicate day dates", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Dup days"
  start_date: 2026-05-03
  has_plan_structure: full
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-05
    goals: []
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1"
    planned_tasks: []
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1 duplicate"
    planned_tasks: []
`,
          "dup-day.yaml",
        ),
        /yaml validation failed in dup-day\.yaml/,
        /duplicates days\[0\]\.date/,
      );
    });

    it("rejects a day before project.start_date", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Range"
  start_date: 2026-05-03
  end_date: 2026-05-07
  has_plan_structure: full
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-07
    goals: []
days:
  - date: 2026-05-02
    segment_order: 1
    title: "Too early"
    planned_tasks: []
`,
          "range.yaml",
        ),
        /yaml validation failed in range\.yaml/,
        /before project\.start_date/,
      );
    });

    it("rejects a day after project.end_date", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Range"
  start_date: 2026-05-03
  end_date: 2026-05-07
  has_plan_structure: full
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-07
    goals: []
days:
  - date: 2026-05-08
    segment_order: 1
    title: "Too late"
    planned_tasks: []
`,
          "range.yaml",
        ),
        /yaml validation failed in range\.yaml/,
        /after project\.end_date/,
      );
    });

    it("rejects a day whose segment_order does not exist", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Bad segment order"
  start_date: 2026-05-03
  has_plan_structure: full
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals: []
days:
  - date: 2026-05-03
    segment_order: 2
    title: "Day 1"
    planned_tasks: []
`,
          "bad-segment-order.yaml",
        ),
        /yaml validation failed in bad-segment-order\.yaml/,
        /does not match any segment\.order/,
      );
    });

    it("rejects open plans with segments or days", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Open"
  start_date: 2026-05-03
  has_plan_structure: open
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals: []
`,
          "open.yaml",
        ),
        /yaml validation failed in open\.yaml/,
        /segments must be absent or empty/,
      );

      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Open"
  start_date: 2026-05-03
  has_plan_structure: open
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1"
    planned_tasks: []
`,
          "open.yaml",
        ),
        /yaml validation failed in open\.yaml/,
        /days must be absent or empty/,
      );
    });

    it("rejects segments plans with days", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Segments"
  start_date: 2026-05-03
  has_plan_structure: segments
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals: []
days:
  - date: 2026-05-03
    segment_order: 1
    title: "Day 1"
    planned_tasks: []
`,
          "segments.yaml",
        ),
        /yaml validation failed in segments\.yaml/,
        /days must be absent or empty when has_plan_structure is segments/,
      );
    });

    it("rejects missing segments when the structure requires them", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Segments"
  start_date: 2026-05-03
  has_plan_structure: segments
`,
          "missing-segments.yaml",
        ),
        /yaml validation failed in missing-segments\.yaml/,
        /segments is required when has_plan_structure is segments/,
      );
    });

    it("rejects missing days when full structure requires them", () => {
      expectSeedError(
        () =>
        parsePlanYamlSource(
          `
project:
  name: "Full"
  start_date: 2026-05-03
  has_plan_structure: full
segments:
  - order: 1
    name: "Phase 1"
    start_date: 2026-05-03
    end_date: 2026-05-04
    goals: []
`,
          "missing-days.yaml",
        ),
        /yaml validation failed in missing-days\.yaml/,
        /days is required when has_plan_structure is full/,
      );
    });

    it("wraps yaml parse errors with the file path and line info", () => {
      expect(() =>
        parsePlanYamlSource(
          `
project:
  name: "Broken"
  start_date: 2026-05-03
  has_plan_structure: full
segments:
  - order: 1
    name "missing colon"
`,
          "broken.yaml",
        ),
      ).toThrow(/yaml parse error in broken\.yaml/);

      try {
        parsePlanYamlSource(
          `
project:
  name: "Broken"
  start_date: 2026-05-03
  has_plan_structure: full
segments:
  - order: 1
    name "missing colon"
`,
          "broken.yaml",
        );
      } catch (error) {
        expect(error).toBeInstanceOf(SeedError);
        expect((error as SeedError).details[0]).toMatch(/^at broken\.yaml:\d+:\d+$/);
      }
    });
  });
}
