import { startOfLocalDay } from "../today/driving-seat";

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_MONDAY_INDEX = 1;
const ISO_SUNDAY_INDEX = 0;

export function isoWeekStart(value: Date): Date {
  const localDay = startOfLocalDay(value);
  const dayOfWeek = localDay.getUTCDay();
  const daysSinceMonday = dayOfWeek === ISO_SUNDAY_INDEX ? 6 : dayOfWeek - ISO_MONDAY_INDEX;

  return new Date(localDay.getTime() - daysSinceMonday * DAY_MS);
}

export function isoWeekEnd(weekStart: Date): Date {
  return new Date(startOfLocalDay(weekStart).getTime() + 6 * DAY_MS);
}

export function weekIndexWithinProject(projectStartDate: Date, weekStart: Date): number {
  const projectStart = startOfLocalDay(projectStartDate);
  const normalizedWeekStart = startOfLocalDay(weekStart);
  const difference = normalizedWeekStart.getTime() - projectStart.getTime();
  const weekIndex = Math.floor(difference / (7 * DAY_MS)) + 1;

  return Math.max(1, weekIndex);
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("weekly-log presentation helpers", () => {
    it("returns the same date when the input is already a Monday", () => {
      expect(isoWeekStart(new Date("2026-04-20T16:30:00+09:00")).toISOString()).toBe("2026-04-20T00:00:00.000Z");
    });

    it("maps Sunday into the same ISO week start", () => {
      expect(isoWeekStart(new Date("2026-04-26T18:00:00+09:00")).toISOString()).toBe("2026-04-20T00:00:00.000Z");
    });

    it("maps a mid-week date back to Monday", () => {
      expect(isoWeekStart(new Date("2026-04-23T09:15:00+09:00")).toISOString()).toBe("2026-04-20T00:00:00.000Z");
      expect(isoWeekEnd(new Date("2026-04-20T00:00:00.000Z")).toISOString()).toBe("2026-04-26T00:00:00.000Z");
    });

    it("handles New Year rollover weeks", () => {
      expect(isoWeekStart(new Date("2027-01-01T08:00:00+09:00")).toISOString()).toBe("2026-12-28T00:00:00.000Z");
    });

    it("keeps the same week through a DST-crossing week", () => {
      expect(isoWeekStart(new Date("2026-03-08T00:30:00-08:00")).toISOString()).toBe("2026-03-02T00:00:00.000Z");
    });

    it("computes a one-based week index within the project window", () => {
      expect(
        weekIndexWithinProject(
          new Date("2026-05-03T00:00:00.000Z"),
          new Date("2026-05-11T00:00:00.000Z"),
        ),
      ).toBe(2);
    });

    it("clamps the week index to one before the project start", () => {
      expect(
        weekIndexWithinProject(
          new Date("2026-05-03T00:00:00.000Z"),
          new Date("2026-04-27T00:00:00.000Z"),
        ),
      ).toBe(1);
    });
  });
}
