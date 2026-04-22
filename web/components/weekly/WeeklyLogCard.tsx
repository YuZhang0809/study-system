import type { WeeklyLogRecord } from "@/lib/weekly-log/queries";
import { WEEKLY_QUESTION_COPY, WEEKLY_QUESTION_ORDER, WEEKLY_SCORE_KEYS, WEEKLY_SCORE_LABEL } from "@/lib/weekly-log/copy";
import { isoWeekEnd, weekIndexWithinProject } from "@/lib/weekly-log/presentation";
import { formatIsoDate } from "@/lib/today/driving-seat";

interface WeeklyLogCardProps {
  log: WeeklyLogRecord;
  projectStartDate: Date;
}

export function WeeklyLogCard({ log, projectStartDate }: WeeklyLogCardProps) {
  const weekIndex = weekIndexWithinProject(projectStartDate, log.weekStart);
  const weekEnd = isoWeekEnd(log.weekStart);

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span className="serif" style={{ fontSize: "var(--t-lg)", fontWeight: 600, letterSpacing: "-0.015em" }}>
          第 {weekIndex} 周
        </span>
        <span className="mono t-xs ink-3 num">
          {formatIsoDate(log.weekStart)} → {formatIsoDate(weekEnd)} · 提交于 {formatLocalDateTime(log.createdAt)}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        <div>
          {WEEKLY_QUESTION_ORDER.map((key, index) => (
            <div
              key={key}
              style={{
                padding: "5px 0",
                borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
              }}
            >
              <div className="mono t-xs ink-3">
                Q{index + 1} · {WEEKLY_QUESTION_COPY[key]}
              </div>
              <div className="serif" style={{ fontSize: "var(--t-md)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {log.reflections[key]}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="block-label">自评</div>
          {WEEKLY_SCORE_KEYS.map((key, index) => {
            const score = log.selfScores[key];

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 24px",
                  gap: 10,
                  alignItems: "center",
                  padding: "3px 0",
                  borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
                }}
              >
                <span className="mono t-xs caps ink-3">{WEEKLY_SCORE_LABEL[key]}</span>
                <div className="tally" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, segmentIndex) => (
                    <div key={segmentIndex} className={`seg${score && score >= segmentIndex + 1 ? " on" : ""}`} />
                  ))}
                </div>
                <span className="mono t-xs num">{score ?? "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatLocalDateTime(value: Date): string {
  const year = `${value.getFullYear()}`;
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
