// Small helper — inclusive day index from project start
function daysSinceStart(iso, startIso) {
  const a = new Date(iso + "T00:00:00");
  const b = new Date(startIso + "T00:00:00");
  return Math.round((a - b) / 86400000);
}

// Plan page — shows segments + days. Calendar view and list view.

const PlanPage = function PlanPage({ proj }) {
  const [view, setView] = React.useState("calendar");
  // Pagination window: "all" | "p1" | "p2" | ... | segment id
  // For an active project, default to the phase containing today.
  const today = proj.today_snapshot?.day_index || 0;
  const defaultScope = (() => {
    if (!proj.today_snapshot) return "all";
    const p = proj.today_snapshot.phase;
    return p ? `p${p.order}` : "all";
  })();
  const [scope, setScope] = React.useState(defaultScope);

  // Build 30-day calendar grid starting from project.start_date
  const start = new Date(proj.start_date + "T00:00:00");
  const days = [];
  for (let i = 0; i < proj.total_days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const idx = i + 1;
    // find segment
    const seg = proj.segments.find(s => iso >= s.start_date && iso <= s.end_date);
    days.push({ iso, idx, seg, dow: d.getDay() });
  }

  // Fake daily status for days already passed
  const statusFor = (idx) => {
    if (idx > today) return "future";
    if (idx === today) return "today";
    // mostly done, a few drift
    if ([6, 12, 15].includes(idx)) return "drift";
    if (idx < today) return "done";
    return "future";
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">计划</h1>
        <span className="page-sub num">
          {proj.start_date} → {proj.end_date} · {proj.total_days} 天 · {proj.segments.length} 个 phase
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 0, border: "1px solid var(--rule-strong)" }}>
          {["calendar", "list"].map(v => (
            <button key={v}
              className="mono t-sm"
              aria-selected={view === v}
              onClick={() => setView(v)}
              style={{
                padding: "5px 12px",
                background: view === v ? "var(--ink)" : "var(--paper)",
                color: view === v ? "var(--paper)" : "var(--ink-3)",
                borderRight: v === "calendar" ? "1px solid var(--rule-strong)" : "none",
                textTransform: "uppercase", letterSpacing: "0.08em"
              }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Segments summary */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${proj.segments.length}, 1fr)`, gap: 14, marginBottom: 22 }}>
        {proj.segments.map(s => {
          const segDays = days.filter(d => d.seg?.id === s.id);
          const doneCount = segDays.filter(d => statusFor(d.idx) === "done").length;
          const driftCount = segDays.filter(d => statusFor(d.idx) === "drift").length;
          const isActive = segDays.some(d => d.idx === today);
          return (
            <div key={s.id} className="card" style={{
              padding: "12px 14px",
              borderTop: isActive ? "2px solid var(--amber)" : "1px solid var(--paper-edge)"
            }}>
              <div className="mono t-xs ink-3 caps" style={{ marginBottom: 4 }}>
                Phase {s.order} · {s.start_date} → {s.end_date}
              </div>
              <div className="serif" style={{ fontSize: "var(--t-lg)", fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 8 }}>
                {s.name.replace(/^Phase \d+ — /, "")}
              </div>
              <div className="tally" style={{ marginBottom: 8 }}>
                {segDays.map((d, i) => {
                  const st = statusFor(d.idx);
                  return <div key={i} className={`seg ${st === "done" ? "on" : st === "drift" ? "drift" : st === "today" ? "today" : ""}`} />;
                })}
              </div>
              <div className="mono t-xs ink-3 num" style={{ display: "flex", gap: 14 }}>
                <span><span style={{ color: "var(--ink)" }}>{doneCount}</span>/{segDays.length} done</span>
                {driftCount > 0 && <span style={{ color: "var(--drift)" }}>{driftCount} drift</span>}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--rule)" }}>
                {s.goals.map((g, i) => (
                  <div key={i} className="serif" style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)", marginBottom: 3 }}>
                    <span className="ink-4" style={{ fontFamily: "var(--mono)", fontSize: "var(--t-xs)" }}>— </span>{g}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {view === "calendar" && (
        <div>
          {/* Scope switcher — phase-based pagination */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span className="mono t-xs ink-3 caps">范围</span>
            <div style={{ display: "flex", border: "1px solid var(--rule-strong)", borderRadius: 2 }}>
              {[{ id: "all", label: `全部 1–${proj.total_days}` },
                ...proj.segments.map(s => ({
                  id: `p${s.order}`,
                  label: `Phase ${s.order} · d${daysSinceStart(s.start_date, proj.start_date)+1}–d${daysSinceStart(s.end_date, proj.start_date)+1}`
                }))
              ].map((opt, i, arr) => (
                <button key={opt.id}
                  className="mono t-xs"
                  aria-selected={scope === opt.id}
                  onClick={() => setScope(opt.id)}
                  style={{
                    padding: "5px 10px",
                    background: scope === opt.id ? "var(--ink)" : "var(--paper)",
                    color: scope === opt.id ? "var(--paper)" : "var(--ink-3)",
                    borderRight: i < arr.length - 1 ? "1px solid var(--rule)" : "none",
                    letterSpacing: "0.04em"
                  }}>{opt.label}</button>
              ))}
            </div>
            <span className="mono t-xs ink-4" style={{ marginLeft: "auto" }}>
              {(() => {
                const visibleDays = scope === "all" ? days
                  : days.filter(d => d.seg && `p${d.seg.order}` === scope);
                return `${visibleDays.length} 天 · ${visibleDays[0]?.iso} → ${visibleDays[visibleDays.length-1]?.iso}`;
              })()}
            </span>
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            {/* week header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              <div />
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="mono t-xs ink-3 caps" style={{ padding: "4px 6px" }}>{d}</div>
              ))}
            </div>
            {/* weeks */}
            {(() => {
              const visibleDays = scope === "all" ? days
                : days.filter(d => d.seg && `p${d.seg.order}` === scope);
              if (visibleDays.length === 0) return null;
              const firstDow = visibleDays[0].dow;
              const padded = [...Array(firstDow).fill(null), ...visibleDays];
              const weeks = [];
              for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
              // Compute starting absolute week number for the visible range
              const firstAbsDay = visibleDays[0].idx;
              const startWeek = Math.ceil(firstAbsDay / 7);
              return weeks.map((w, wi) => (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                  <div className="mono t-xs ink-4" style={{ padding: "6px 4px", textAlign: "right" }}>w{startWeek + wi}</div>
                  {w.map((d, di) => {
                    if (!d) return <div key={di} />;
                    const st = statusFor(d.idx);
                    const isToday = st === "today";
                    return (
                      <div key={di} style={{
                        minHeight: 58,
                        padding: "4px 6px",
                        background: st === "done" ? "var(--paper-2)"
                                  : st === "drift" ? "var(--drift-wash)"
                                  : isToday ? "var(--amber-wash)"
                                  : "var(--paper)",
                        border: isToday ? "1px solid var(--amber)" : "1px solid var(--paper-edge)",
                        position: "relative"
                      }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                          <span className="mono t-xs ink-3 num">d{d.idx}</span>
                          <span className="mono t-xs ink-4 num">{d.iso.slice(5)}</span>
                        </div>
                        <div className="serif" style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.25, marginTop: 3 }}>
                          {d.seg ? `p${d.seg.order}` : ""}
                          {st === "done" && <span style={{ marginLeft: 4, color: "var(--done)" }}>✓</span>}
                          {st === "drift" && <span style={{ marginLeft: 4, color: "var(--drift)" }}>—</span>}
                          {isToday && <span style={{ marginLeft: 4, color: "var(--amber-ink)", fontWeight: 600 }}>今日</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {view === "list" && (
        <div>
          <BlockLabel>Days (list)</BlockLabel>
          <table className="ledger">
            <thead>
              <tr>
                <th style={{ width: 50 }}>天</th>
                <th style={{ width: 110 }}>日期</th>
                <th style={{ width: 60 }}>阶段</th>
                <th>标题 / 任务</th>
                <th style={{ width: 80 }}>状态</th>
                <th style={{ width: 70, textAlign: "right" }}>时长</th>
              </tr>
            </thead>
            <tbody>
              {(scope === "all" ? days.slice(0, 30)
                 : days.filter(d => d.seg && `p${d.seg.order}` === scope)).map(d => {
                const st = statusFor(d.idx);
                return (
                  <tr key={d.iso} style={{ background: st === "today" ? "var(--amber-wash)" : "transparent" }}>
                    <td className="mono num">d{d.idx}</td>
                    <td className="mono ink-3 num">{d.iso} {dayOfWeek(d.iso)}</td>
                    <td className="mono ink-3">p{d.seg?.order || "-"}</td>
                    <td className="serif">{d.seg ? `${d.seg.name.replace(/^Phase \d+ — /, "")} · d${d.idx}` : "(未分阶段)"}</td>
                    <td>
                      {st === "done"   && <span className="mono t-xs" style={{ color: "var(--done)" }}>完成</span>}
                      {st === "drift"  && <span className="mono t-xs" style={{ color: "var(--drift)" }}>偏离</span>}
                      {st === "today"  && <span className="mono t-xs" style={{ color: "var(--amber-ink)" }}>今天</span>}
                      {st === "future" && <span className="mono t-xs ink-4">—</span>}
                    </td>
                    <td className="mono num ink-3" style={{ textAlign: "right" }}>
                      {st === "done" ? `${90 + (d.idx * 13) % 160}m` : st === "drift" ? "—" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

window.PlanPage = PlanPage;
