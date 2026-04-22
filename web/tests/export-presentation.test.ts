import { describe, expect, it } from "vitest";
import { formatExportSummary, formatFileSize } from "../lib/export/presentation";

describe("export presentation", () => {
  it("formats an empty-db summary line with zero counts", () => {
    expect(
      formatExportSummary(
        {
          daily_log: 0,
          weekly_log: 0,
          retro: 0,
          knowledge_item: 0,
          artifact: 0,
          open_item: 0,
          blocker: 0,
          bookmark: 0,
        },
        420,
      ),
    ).toBe(
      "导出 · 0 份日志 · 0 份周记 · 0 份复盘 · 0 条 knowledge · 0 个 artifact · 0 个未清账 · 0 个阻塞 · 0 个 bookmark · 文件 420 B",
    );
  });

  it("formats a single-digit non-empty summary line", () => {
    expect(
      formatExportSummary(
        {
          daily_log: 3,
          weekly_log: 1,
          retro: 2,
          knowledge_item: 4,
          artifact: 5,
          open_item: 6,
          blocker: 7,
          bookmark: 8,
        },
        1536,
      ),
    ).toBe(
      "导出 · 3 份日志 · 1 份周记 · 2 份复盘 · 4 条 knowledge · 5 个 artifact · 6 个未清账 · 7 个阻塞 · 8 个 bookmark · 文件 1.5 KB",
    );
  });

  it("formats bytes and KB sizes correctly", () => {
    expect(formatFileSize(999)).toBe("999 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats MB sizes correctly", () => {
    expect(formatFileSize(3 * 1024 * 1024 + 512 * 1024)).toBe("3.5 MB");
  });
});
