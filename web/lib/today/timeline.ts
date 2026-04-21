import { sameDayUtc, startOfDayUtc } from "./driving-seat";

export interface TimelineProject {
  startDate: Date;
  endDate: Date | null;
}

export interface TimelineSegment {
  id: string;
  startDate: Date;
  endDate: Date;
}

export interface TimelineCell {
  date: Date;
  isToday: boolean;
  segmentId: string | null;
  isPhaseBoundary: boolean;
}

export interface TimelineState {
  cells: TimelineCell[];
  showBand: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildTimelineState(
  project: TimelineProject,
  segments: readonly TimelineSegment[],
  today: Date,
): TimelineState {
  if (!project.endDate) {
    return {
      cells: [],
      showBand: false,
    };
  }

  const cells: TimelineCell[] = [];
  const start = startOfDayUtc(project.startDate).getTime();
  const end = startOfDayUtc(project.endDate).getTime();
  const phaseBoundaryStamps = new Set(
    segments
      .map((segment) => startOfDayUtc(segment.startDate).getTime())
      .filter((stamp) => stamp !== start),
  );

  for (let stamp = start; stamp <= end; stamp += DAY_MS) {
    const date = new Date(stamp);
    const segment = segments.find((candidate) => {
      const candidateStart = startOfDayUtc(candidate.startDate).getTime();
      const candidateEnd = startOfDayUtc(candidate.endDate).getTime();
      return stamp >= candidateStart && stamp <= candidateEnd;
    });

    cells.push({
      date,
      isToday: sameDayUtc(date, today),
      segmentId: segment?.id ?? null,
      isPhaseBoundary: phaseBoundaryStamps.has(stamp),
    });
  }

  return {
    cells,
    showBand: true,
  };
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("buildTimelineState", () => {
    it("builds one cell per day across the project window", () => {
      const state = buildTimelineState(
        {
          startDate: new Date("2026-05-03T00:00:00.000Z"),
          endDate: new Date("2026-05-07T00:00:00.000Z"),
        },
        [
          {
            id: "seg-1",
            startDate: new Date("2026-05-03T00:00:00.000Z"),
            endDate: new Date("2026-05-04T00:00:00.000Z"),
          },
          {
            id: "seg-2",
            startDate: new Date("2026-05-05T00:00:00.000Z"),
            endDate: new Date("2026-05-07T00:00:00.000Z"),
          },
        ],
        new Date("2026-05-05T00:00:00.000Z"),
      );

      expect(state.showBand).toBe(true);
      expect(state.cells).toHaveLength(5);
      expect(state.cells[2]).toMatchObject({
        isToday: true,
        segmentId: "seg-2",
        isPhaseBoundary: true,
      });
      expect(state.cells[0].isPhaseBoundary).toBe(false);
    });

    it("omits the band when the project is open-ended", () => {
      const state = buildTimelineState(
        {
          startDate: new Date("2026-05-03T00:00:00.000Z"),
          endDate: null,
        },
        [],
        new Date("2026-05-05T00:00:00.000Z"),
      );

      expect(state.showBand).toBe(false);
      expect(state.cells).toEqual([]);
    });

    it("does not mark a today cell when today is outside the project range", () => {
      const state = buildTimelineState(
        {
          startDate: new Date("2026-05-03T00:00:00.000Z"),
          endDate: new Date("2026-05-07T00:00:00.000Z"),
        },
        [],
        new Date("2026-05-01T00:00:00.000Z"),
      );

      expect(state.cells.some((cell) => cell.isToday)).toBe(false);
    });
  });
}
