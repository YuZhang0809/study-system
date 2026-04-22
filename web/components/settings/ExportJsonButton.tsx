"use client";

import { useState } from "react";
import type { ExportEnvelope } from "@/lib/export/shape";
import { formatExportSummary, type ExportSummaryCounts } from "@/lib/export/presentation";

type ExportStatus =
  | { kind: "idle" }
  | { kind: "exporting" }
  | { kind: "done"; summary: string }
  | { kind: "error"; message: string };

export function ExportJsonButton() {
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });

  async function handleClick() {
    setStatus({ kind: "exporting" });

    try {
      const response = await fetch("/api/export");

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: normalizeFailureReason(await response.text()),
        });
        return;
      }

      const text = await response.text();
      const envelope = JSON.parse(text) as ExportEnvelope;
      const counts = buildCounts(envelope);
      const blob = new Blob([text], { type: "application/json; charset=utf-8" });
      const bytes = blob.size;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      try {
        link.href = url;
        link.download = buildFileName(envelope.exported_at);
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }

      setStatus({
        kind: "done",
        summary: formatExportSummary(counts, bytes),
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: normalizeFailureReason(error),
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
      <button
        type="button"
        className="btn"
        onClick={handleClick}
        disabled={status.kind === "exporting"}
      >
        导出 JSON
      </button>
      <p
        aria-live="polite"
        className={status.kind === "error" ? "daily-log-error mono t-sm" : "mono t-sm ink-3"}
        style={{ margin: 0, minHeight: 18 }}
      >
        {status.kind === "done" ? status.summary : null}
        {status.kind === "error" ? `导出失败 · ${status.message}` : null}
      </p>
    </div>
  );
}

function buildCounts(envelope: ExportEnvelope): ExportSummaryCounts {
  return {
    daily_log: envelope.tables.daily_log.length,
    weekly_log: envelope.tables.weekly_log.length,
    retro: envelope.tables.retro.length,
    knowledge_item: envelope.tables.knowledge_item.length,
    artifact: envelope.tables.artifact.length,
    open_item: envelope.tables.open_item.length,
    blocker: envelope.tables.blocker.length,
    bookmark: envelope.tables.bookmark.length,
  };
}

function buildFileName(exportedAt: string): string {
  return `study-system-${exportedAt.replaceAll(":", "-").replaceAll(".", "-")}.json`;
}

function normalizeFailureReason(reason: unknown): string {
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }

  if (reason instanceof SyntaxError) {
    return "返回内容不是 JSON";
  }

  if (reason instanceof Error) {
    return "请求未完成";
  }

  return "导出未完成";
}
