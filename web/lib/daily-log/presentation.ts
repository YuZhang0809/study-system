import type { DailyLogRecord } from "./queries";

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
  });
}
