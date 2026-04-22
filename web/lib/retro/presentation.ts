import { startOfLocalDay } from "../today/driving-seat";

export type RetroEligibilityReason = "none_finished" | "all_retroed";

export interface RetroSegmentLike {
  id: string;
  projectId: string;
  order: number;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface RetroLike {
  segmentId: string;
}

export type RetroEligibility =
  | { segment: RetroSegmentLike; reason: null }
  | { segment: null; reason: RetroEligibilityReason };

export function selectEligibleSegment(
  project: { id: string },
  segments: readonly RetroSegmentLike[],
  retros: readonly RetroLike[],
  now: Date,
): RetroEligibility {
  const today = startOfLocalDay(now);
  const finishedSegments = segments
    .filter((segment) => segment.projectId === project.id)
    .filter((segment) => startOfLocalDay(segment.endDate).getTime() < today.getTime())
    .sort((left, right) => startOfLocalDay(right.endDate).getTime() - startOfLocalDay(left.endDate).getTime());

  if (finishedSegments.length === 0) {
    return { segment: null, reason: "none_finished" };
  }

  const completedSegmentIds = new Set(retros.map((retro) => retro.segmentId));
  const eligibleSegment = finishedSegments.find((segment) => !completedSegmentIds.has(segment.id)) ?? null;

  if (!eligibleSegment) {
    return { segment: null, reason: "all_retroed" };
  }

  return { segment: eligibleSegment, reason: null };
}

export function pickPreviousRetro<TRetro extends RetroLike>(
  eligibleSegment: RetroSegmentLike | null,
  segments: readonly RetroSegmentLike[],
  retros: readonly TRetro[],
): TRetro | null {
  if (!eligibleSegment) {
    return null;
  }

  const orderedSegments = [...segments]
    .filter((segment) => segment.projectId === eligibleSegment.projectId)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return startOfLocalDay(left.startDate).getTime() - startOfLocalDay(right.startDate).getTime();
    });

  const eligibleIndex = orderedSegments.findIndex((segment) => segment.id === eligibleSegment.id);

  if (eligibleIndex <= 0) {
    return null;
  }

  const previousSegment = orderedSegments[eligibleIndex - 1] ?? null;

  if (!previousSegment) {
    return null;
  }

  return retros.find((retro) => retro.segmentId === previousSegment.id) ?? null;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const project = { id: "project-1" };
  const segments: RetroSegmentLike[] = [
    {
      id: "segment-1",
      projectId: project.id,
      order: 1,
      name: "第一阶段",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-05-07T00:00:00.000Z"),
    },
    {
      id: "segment-2",
      projectId: project.id,
      order: 2,
      name: "第二阶段",
      startDate: new Date("2026-05-08T00:00:00.000Z"),
      endDate: new Date("2026-05-14T00:00:00.000Z"),
    },
    {
      id: "segment-3",
      projectId: project.id,
      order: 3,
      name: "第三阶段",
      startDate: new Date("2026-05-15T00:00:00.000Z"),
      endDate: new Date("2026-05-21T00:00:00.000Z"),
    },
  ];

  describe("retro presentation helpers", () => {
    it("returns none_finished when the project has no finished segment", () => {
      expect(
        selectEligibleSegment(project, segments, [], new Date("2026-05-07T00:00:00.000Z")),
      ).toEqual({ segment: null, reason: "none_finished" });
    });

    it("selects the most recent finished segment without a retro", () => {
      const result = selectEligibleSegment(project, segments, [], new Date("2026-05-16T00:00:00.000Z"));

      expect(result.reason).toBeNull();
      expect(result.segment?.id).toBe("segment-2");
    });

    it("skips finished segments that already have a retro", () => {
      const result = selectEligibleSegment(
        project,
        segments,
        [{ segmentId: "segment-2" }],
        new Date("2026-05-16T00:00:00.000Z"),
      );

      expect(result.reason).toBeNull();
      expect(result.segment?.id).toBe("segment-1");
    });

    it("returns all_retroed when every finished segment already has a retro", () => {
      expect(
        selectEligibleSegment(
          project,
          segments,
          [{ segmentId: "segment-1" }, { segmentId: "segment-2" }],
          new Date("2026-05-16T00:00:00.000Z"),
        ),
      ).toEqual({ segment: null, reason: "all_retroed" });
    });

    it("picks the retro for the immediately preceding segment", () => {
      const previousRetro = pickPreviousRetro(
        segments[1],
        segments,
        [
          { segmentId: "segment-1", marker: "first" },
          { segmentId: "segment-3", marker: "third" },
        ],
      );

      expect(previousRetro?.marker).toBe("first");
    });
  });
}
