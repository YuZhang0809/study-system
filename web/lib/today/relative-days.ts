import { differenceInLocalDays, startOfLocalDay } from "./driving-seat";

export function relativeDays(date: Date, today: Date): string {
  const diff = differenceInLocalDays(startOfLocalDay(today), startOfLocalDay(date));

  if (diff <= 0) {
    return "今日";
  }

  if (diff === 1) {
    return "昨日";
  }

  return `${diff}d`;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("relativeDays", () => {
    it("returns 今日 for same-day timestamps", () => {
      expect(relativeDays(new Date("2026-05-05T08:00:00+09:00"), new Date("2026-05-05T23:30:00+09:00"))).toBe("今日");
    });

    it("returns 昨日 for one-day differences", () => {
      expect(relativeDays(new Date("2026-05-04T08:00:00+09:00"), new Date("2026-05-05T23:30:00+09:00"))).toBe("昨日");
    });

    it("returns Nd for older entries", () => {
      expect(relativeDays(new Date("2026-05-01T08:00:00+09:00"), new Date("2026-05-05T23:30:00+09:00"))).toBe("4d");
    });
  });
}
