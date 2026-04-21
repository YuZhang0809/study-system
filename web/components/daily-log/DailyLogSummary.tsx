import { formatDailyLogSummary } from "@/lib/daily-log/presentation";
import type { DailyLogRecord } from "@/lib/daily-log/queries";

interface DailyLogSummaryProps {
  log: Pick<DailyLogRecord, "timeSpentMinutes" | "whatDone" | "whatSkipped">;
  onExpand: () => void;
}

export function DailyLogSummary({ log, onExpand }: DailyLogSummaryProps) {
  return (
    <div className="daily-log-summary">
      <p className="daily-log-summary-text">{formatDailyLogSummary(log)}</p>
      <button type="button" className="daily-log-summary-link" onClick={onExpand}>
        展开修改
      </button>
    </div>
  );
}
