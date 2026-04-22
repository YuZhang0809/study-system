import { EXPORT_TABLE_KEYS, type ExportTableKey } from "./shape";

export type ExportSummaryCounts = Record<ExportTableKey, number>;

const SUMMARY_LABELS: Record<ExportTableKey, string> = {
  daily_log: "份日志",
  weekly_log: "份周记",
  retro: "份复盘",
  knowledge_item: "条 knowledge",
  artifact: "个 artifact",
  open_item: "个未清账",
  blocker: "个阻塞",
  bookmark: "个 bookmark",
};

export function formatExportSummary(counts: ExportSummaryCounts, bytes: number): string {
  const parts = EXPORT_TABLE_KEYS.map((key) => `${counts[key]} ${SUMMARY_LABELS[key]}`);
  return `导出 · ${parts.join(" · ")} · 文件 ${formatFileSize(bytes)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("export presentation", () => {
    it("formats the full restrained summary line", () => {
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

    it("formats KB and MB sizes with one decimal place", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(3 * 1024 * 1024 + 512 * 1024)).toBe("3.5 MB");
    });
  });
}
