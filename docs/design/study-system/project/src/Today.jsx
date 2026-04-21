// Today page — 驾驶舱. 3 layout variations via Tweaks.
// Variations:
//   A: "Ledger"  — left: promises/plan, center: tape (recent activity), right: open items/blockers
//   B: "Stacked" — top: promises from yesterday, middle: today's plan, bottom: open accounts
//   C: "Column"  — single narrow column, ledger-style, vertical rhythm

const { useState: useStateT } = React;

function TodayBlockPromises({ snap }) {
  return (
    <div>
      <BlockLabel count={snap.promises.length}>昨日之承诺 · 未结清</BlockLabel>
      <div className="card" style={{ padding: "10px 14px" }}>
        {snap.promises.map((p, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "14px 1fr auto",
            gap: 10, alignItems: "start",
            padding: "8px 0",
            borderTop: i === 0 ? "none" : "1px dashed var(--rule)"
          }}>
            <span className="check" title="未完成"></span>
            <div>
              <div className="serif" style={{ fontSize: "var(--t-md)", lineHeight: 1.4 }}>
                “{p.text}”
              </div>
              <div className="mono t-xs ink-3" style={{ marginTop: 3 }}>
                来自 {p.from} · {p.at}
              </div>
            </div>
            <span className="mono t-xs" style={{ color: "var(--drift)" }}>未兑现</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayBlockPlan({ snap, state, setState }) {
  const toggle = (id) => {
    const next = { ...state, done: { ...state.done, [id]: !state.done[id] } };
    setState(next);
  };
  const sourceLabel = { plan: "计划", promise: "承诺", blocker: "阻塞" };
  return (
    <div>
      <BlockLabel count={snap.planned.length}>今日 · {snap.date} · {dayOfWeek(snap.date)}</BlockLabel>
      <div className="card card--ruled" style={{ padding: "6px 14px" }}>
        {snap.planned.map((t, i) => (
          <div key={t.id} style={{
            display: "grid", gridTemplateColumns: "14px 1fr auto",
            gap: 10, alignItems: "start", padding: "10px 0",
            borderTop: i === 0 ? "none" : "1px dashed var(--rule)"
          }}>
            <span
              className={`check ${state.done[t.id] ? "check--done" : ""}`}
              onClick={() => toggle(t.id)}
              style={{ cursor: "pointer", marginTop: 3 }}
            />
            <div style={{
              fontSize: "var(--t-md)", lineHeight: 1.4,
              textDecoration: state.done[t.id] ? "line-through" : "none",
              color: state.done[t.id] ? "var(--ink-3)" : "var(--ink)"
            }}>
              {t.text}
            </div>
            <span className="mono t-xs ink-3">{sourceLabel[t.source]}</span>
          </div>
        ))}
        <div style={{
          display: "grid", gridTemplateColumns: "14px 1fr", gap: 10,
          padding: "10px 0", borderTop: "1px dashed var(--rule)",
          color: "var(--ink-4)", fontFamily: "var(--sans)"
        }}>
          <Icon name="plus" size={12} stroke="var(--ink-4)" />
          <span>加一条（计划外也行，不算偏离）</span>
        </div>
      </div>
    </div>
  );
}

function TodayBlockTape({ proj }) {
  const kindIcon = { log: "note", learning: "learning", artifact: "link",
                     prompt: "prompt", bug: "bug", weekly: "refl", concept: "concept" };
  return (
    <div>
      <BlockLabel count={proj.today_snapshot.tape.length}>最近动静</BlockLabel>
      <div className="card" style={{ padding: "4px 12px", fontFamily: "var(--mono)", fontSize: "var(--t-sm)" }}>
        {proj.today_snapshot.tape.map((e, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "14px 110px 1fr",
            gap: 8, padding: "6px 0", alignItems: "start",
            borderTop: i === 0 ? "none" : "1px dashed var(--rule)",
            color: "var(--ink-2)"
          }}>
            <Icon name={kindIcon[e.kind] || "note"} size={12} stroke="var(--ink-3)" />
            <span className="ink-3 num">{e.t}</span>
            <span className="serif" style={{ fontSize: "var(--t-md)" }}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayBlockOpen({ proj }) {
  return (
    <div>
      <BlockLabel count={proj.open_items.length}>未清账</BlockLabel>
      <div className="card" style={{ padding: "6px 12px" }}>
        {proj.open_items.map((o, i) => (
          <div key={o.id} style={{
            padding: "8px 0",
            borderTop: i === 0 ? "none" : "1px dashed var(--rule)",
            display: "grid", gridTemplateColumns: "1fr auto", gap: 8
          }}>
            <div>
              <div className="serif" style={{ fontSize: "var(--t-md)", lineHeight: 1.4 }}>{o.text}</div>
              <div className="mono t-xs ink-3" style={{ marginTop: 3 }}>
                开于 {o.opened_at} · {o.source}
              </div>
            </div>
            <span className="mono t-xs" style={{
              color: o.days_overdue > 7 ? "var(--drift)" : "var(--ink-3)",
              whiteSpace: "nowrap", alignSelf: "start"
            }}>
              +{o.days_overdue}d
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayBlockBlockers({ proj }) {
  return (
    <div>
      <BlockLabel count={proj.blockers.length}>阻塞</BlockLabel>
      {proj.blockers.length === 0 ? (
        <div className="empty">无。</div>
      ) : (
        <div className="card" style={{ padding: "10px 14px" }}>
          {proj.blockers.map((b) => (
            <div key={b.id} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 10 }}>
              <Icon name="blocker" size={13} stroke="var(--drift)" />
              <div>
                <div className="serif" style={{ fontSize: "var(--t-md)", lineHeight: 1.4 }}>{b.text}</div>
                <div className="mono t-xs ink-3" style={{ marginTop: 3 }}>开于 {b.opened_at}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayWhereYouAre({ proj }) {
  const snap = proj.today_snapshot;
  const phase = snap.phase;
  const phaseName = phase.name.replace(/^Phase \d+ — /, "");
  const daysLeftInPhase = snap.phase_total - snap.phase_day;
  const daysLeftTotal = proj.total_days - snap.day_index;

  // Full-project timeline: each cell = one day. Phase boundaries marked.
  const cells = [];
  for (let i = 1; i <= proj.total_days; i++) {
    const seg = proj.segments.find(s => {
      const d = new Date(proj.start_date + "T00:00:00");
      d.setDate(d.getDate() + i - 1);
      const iso = d.toISOString().slice(0, 10);
      return iso >= s.start_date && iso <= s.end_date;
    });
    let state = "future";
    if (i < snap.day_index) state = [6, 12, 15].includes(i) ? "drift" : "on";
    else if (i === snap.day_index) state = "today";
    cells.push({ i, state, phase: seg?.order });
  }

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      {/* Sentence-style "where am I" — reads left to right as one thought */}
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10,
                    fontFamily: "var(--serif)", fontSize: "var(--t-lg)", lineHeight: 1.5 }}>
        <span className="ink-3 mono t-xs caps">你现在在</span>
        <span>
          <span className="num" style={{ color: "var(--amber-ink)", fontWeight: 500 }}>
            第 {snap.day_index} 天
          </span>
          <span className="ink-3"> / {proj.total_days}</span>
        </span>
        <span className="ink-4">·</span>
        <span>
          <span style={{ fontWeight: 600 }}>{phaseName}</span>
          <span className="ink-3"> 的第 </span>
          <span className="num" style={{ color: "var(--ink)" }}>{snap.phase_day}</span>
          <span className="ink-3"> / {snap.phase_total} 天</span>
        </span>
        <span style={{ marginLeft: "auto" }} className="mono t-xs ink-3">
          距本阶段结束 <span className="num" style={{ color: daysLeftInPhase <= 7 ? "var(--amber-ink)" : "var(--ink)" }}>
            {daysLeftInPhase} 天
          </span>
          <span className="ink-4"> · </span>
          距项目结束 <span className="num" style={{ color: "var(--ink)" }}>{daysLeftTotal} 天</span>
        </span>
      </div>

      {/* Timeline — 30 cells with phase labels above */}
      <div style={{ marginTop: 14 }}>
        <div style={{ position: "relative", display: "flex", gap: 1, height: 14,
                      alignItems: "stretch" }}>
          {cells.map((c) => (
            <div key={c.i} title={`第 ${c.i} 天 · ${c.state}`}
                 style={{
                   flex: 1,
                   background: c.state === "on"     ? "var(--ink)"
                             : c.state === "drift"  ? "var(--drift)"
                             : c.state === "today"  ? "var(--amber)"
                             : "var(--paper-3)",
                   outline: c.state === "today" ? "2px solid var(--amber)" : "none",
                   outlineOffset: c.state === "today" ? "2px" : 0,
                   zIndex: c.state === "today" ? 2 : 1
                 }} />
          ))}
        </div>
        {/* Phase tick marks below the timeline */}
        <div style={{ display: "flex", gap: 1, marginTop: 6 }}>
          {proj.segments.map((s, i) => {
            const segLen = cells.filter(c => c.phase === s.order).length;
            return (
              <div key={s.id} style={{
                flex: segLen,
                borderLeft: "1px solid var(--rule-strong)",
                paddingLeft: 6, paddingTop: 2,
                fontFamily: "var(--mono)", fontSize: "var(--t-xs)",
                color: s.order === phase.order ? "var(--amber-ink)" : "var(--ink-3)",
                display: "flex", alignItems: "baseline", gap: 4
              }}>
                <span className="caps">阶段 {s.order}</span>
                <span className="ink-4 num">{s.start_date.slice(5)}–{s.end_date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Facts strip — clearly-worded, each fact a "subject + number" */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--rule)",
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 18, fontFamily: "var(--serif)", fontSize: "var(--t-sm)",
                    color: "var(--ink-2)" }}>
        <div>
          连续记录 <span className="num mono" style={{ color: "var(--ink)", fontSize: "var(--t-md)" }}>12</span> 天
        </div>
        <div>
          累计 <span className="num mono" style={{ color: "var(--ink)", fontSize: "var(--t-md)" }}>{proj.stats.commits}</span> 次提交 · <span className="num mono" style={{ color: "var(--ink)", fontSize: "var(--t-md)" }}>{proj.stats.learnings}</span> 条心得
        </div>
        <div>
          本周偏离 <span className="num mono" style={{ color: "var(--drift)", fontSize: "var(--t-md)" }}>3</span><span className="ink-3"> / 7 天</span>
        </div>
        <div style={{ textAlign: "right" }}>
          昨日承诺 <span className="num mono" style={{ color: "var(--drift)", fontSize: "var(--t-md)" }}>2</span><span className="ink-3"> 条未兑现</span>
        </div>
      </div>
    </div>
  );
}

window.TodayPage = function TodayPage({ proj, layout, onEndOfDay }) {
  const [state, setState] = useStateT({ done: { t1: false, t2: false, t3: false } });
  const snap = proj.today_snapshot;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">今日</h1>
        <span className="page-sub num">{snap.date} · {dayOfWeek(snap.date)} · d{snap.day_index}/{proj.total_days}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="plus" size={11}/> 记一条 <Kbd>N</Kbd></button>
          <button className="btn btn--primary" onClick={onEndOfDay}>
            今日收工 <Kbd>⌘↵</Kbd>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <TodayWhereYouAre proj={proj} />
      </div>

      {layout === "ledger" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.15fr 1fr", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <TodayBlockPromises snap={snap} />
            <TodayBlockPlan snap={snap} state={state} setState={setState} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <TodayBlockTape proj={proj} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <TodayBlockOpen proj={proj} />
            <TodayBlockBlockers proj={proj} />
          </div>
        </div>
      )}

      {layout === "stacked" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 920 }}>
          <TodayBlockPromises snap={snap} />
          <TodayBlockPlan snap={snap} state={state} setState={setState} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
            <TodayBlockOpen proj={proj} />
            <TodayBlockBlockers proj={proj} />
          </div>
          <TodayBlockTape proj={proj} />
        </div>
      )}

      {layout === "column" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 640, margin: "0 auto" }}>
          <TodayBlockPromises snap={snap} />
          <TodayBlockPlan snap={snap} state={state} setState={setState} />
          <TodayBlockOpen proj={proj} />
          <TodayBlockBlockers proj={proj} />
          <TodayBlockTape proj={proj} />
        </div>
      )}
    </div>
  );
};
