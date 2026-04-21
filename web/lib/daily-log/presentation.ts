import type { DailyLogRecord } from "./queries";
import { startOfLocalDay } from "../today/driving-seat";

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDailyLogSummary(log: Pick<DailyLogRecord, "timeSpentMinutes" | "whatDone" | "whatSkipped">) {
  return `今日 · ${log.timeSpentMinutes} 分 · ${log.whatDone.length} 做 · ${log.whatSkipped.length} 跳过`;
}

export function formatMonthDay(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

export function formatHourMinute(value: Date): string {
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function daysOpen(openedAt: Date, today: Date): number {
  return Math.round((startOfLocalDay(today).getTime() - startOfLocalDay(openedAt).getTime()) / DAY_MS);
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("daily-log presentation helpers", () => {
    it("formats the collapsed daily-log summary", () => {
      expect(
        formatDailyLogSummary({
          timeSpentMinutes: 135,
          whatDone: ["写 action", "补测试"],
          whatSkipped: ["清理样式"],
        }),
      ).toBe("今日 · 135 分 · 2 做 · 1 跳过");
    });

    it("formats month-day labels with zero padding", () => {
      expect(formatMonthDay(new Date("2026-05-03T09:00:00.000Z"))).toBe("05-03");
    });

    it("formats hour-minute labels with zero padding", () => {
      expect(formatHourMinute(new Date("2026-05-03T09:05:00.000Z"))).toBe("09:05");
    });

    it("returns zero days for items opened on the same local day", () => {
      expect(daysOpen(new Date("2026-05-05T01:00:00.000Z"), new Date("2026-05-05T23:00:00.000Z"))).toBe(0);
    });

    it("returns one day once the local calendar day rolls over", () => {
      expect(daysOpen(new Date("2026-05-04T23:30:00.000Z"), new Date("2026-05-05T00:30:00.000Z"))).toBe(1);
    });

    it("returns multi-day spans across several local dates", () => {
      expect(daysOpen(new Date("2026-05-01T09:00:00.000Z"), new Date("2026-05-05T09:00:00.000Z"))).toBe(4);
    });

    it("uses local calendar boundaries across DST transitions", () => {
      expect(daysOpen(new Date("2026-03-08T00:30:00-08:00"), new Date("2026-03-09T00:30:00-07:00"))).toBe(1);
    });
  });
}
