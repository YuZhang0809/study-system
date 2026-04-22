import { RETRO_METRIC_KEYS, RETRO_METRIC_LABEL, RETRO_SCORE_KEYS, RETRO_SCORE_LABEL, RETRO_THREE_QUESTION_COPY, RETRO_THREE_QUESTION_ORDER } from "@/lib/retro/copy";
import type { RetroRecord } from "@/lib/retro/queries";

interface PhaseRetroCardProps {
  retro: RetroRecord;
}

export function PhaseRetroCard({ retro }: PhaseRetroCardProps) {
  const driftPercent = retro.metrics.planned_days > 0
    ? Math.round((retro.metrics.drift_days / retro.metrics.planned_days) * 100)
    : 0;

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="serif" style={{ fontSize: "var(--t-xl)", fontWeight: 600, letterSpacing: "-0.018em" }}>
          第 {retro.segment.order} 阶段 — {retro.segment.name}
        </span>
        <span className="mono t-xs ink-3 num">提交于 {formatLocalDateTime(retro.createdAt)}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 18,
          paddingBottom: 12,
          borderBottom: "1px dashed var(--rule)",
        }}
      >
        {RETRO_METRIC_KEYS.map((key) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="mono t-xs ink-3 caps">{RETRO_METRIC_LABEL[key]}</span>
            <span className="mono" style={{ fontSize: "var(--t-lg)", color: "var(--ink)" }}>
              {retro.metrics[key]}
            </span>
            {key === "drift_days" ? <span className="mono t-xs ink-4">{driftPercent}%</span> : null}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 14 }}>
        <div>
          <div className="block-label">6 能力自评 · 1–5</div>
          {RETRO_SCORE_KEYS.map((key, index) => {
            const score = retro.selfScores[key];

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 24px",
                  gap: 10,
                  alignItems: "center",
                  padding: "4px 0",
                  borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
                }}
              >
                <span className="mono t-xs caps ink-3">{RETRO_SCORE_LABEL[key]}</span>
                <div className="tally" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, segmentIndex) => (
                    <div key={segmentIndex} className={`seg${score >= segmentIndex + 1 ? " on" : ""}`} />
                  ))}
                </div>
                <span className="mono t-xs num">{score}</span>
              </div>
            );
          })}
        </div>

        <div>
          <div className="block-label">三问</div>
          {RETRO_THREE_QUESTION_ORDER.map((key, index) => (
            <div
              key={key}
              style={{
                padding: "8px 0",
                borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
              }}
            >
              <div className="mono t-xs ink-3">
                Q{index + 1} · {RETRO_THREE_QUESTION_COPY[key]}
              </div>
              <div className="serif" style={{ fontSize: "var(--t-md)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {retro.threeQuestions[key]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--rule)" }}>
        <div className="block-label">Scope 调整 · 承认偏离,非辩解</div>
        {retro.scopeChanges.length === 0 ? (
          <p className="mono t-xs ink-4" style={{ margin: 0 }}>
            (无)
          </p>
        ) : (
          retro.scopeChanges.map((scopeChange, index) => (
            <div
              key={`${scopeChange.change}-${scopeChange.reason}-${index}`}
              className="serif"
              style={{
                fontSize: "var(--t-md)",
                padding: "5px 0",
                borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
              }}
            >
              <span className="mono t-xs ink-3" style={{ marginRight: 8 }}>
                {index + 1}.
              </span>
              {scopeChange.change}
              <span className="ink-3"> — {scopeChange.reason}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--rule)" }}>
        <div className="block-label">下一阶段 · 第 1 天第一件事</div>
        <div className="serif" style={{ fontSize: "var(--t-md)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {retro.nextPhaseFirstThing ?? "—"}
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
