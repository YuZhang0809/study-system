// Retros page — 阶段复盘 + 周记列表。阶段复盘是一个向导。

const SCORE_LABEL = {
  clarity: "清晰度", honesty: "诚实", output: "产出",
  depth: "深度", discipline: "自律", energy: "精力"
};
const METRIC_LABEL = {
  commits: "提交数", logs: "日记数", learnings: "心得数",
  bugs: "缺陷数", prompts: "提示数", artifacts: "产出数",
  planned_days: "计划天", drift_days: "偏离天",
  blockers_open: "未解阻塞", open_items: "未清账",
  weekly_scores_avg: "周平均分", drift_rate: "偏离率"
};

const RetrosPage = function RetrosPage({ proj }) {
  const [active, setActive] = React.useState("phase");   // phase | weekly
  const [wizard, setWizard] = React.useState(false);
  const [step, setStep] = React.useState(1);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">复盘</h1>
        <span className="page-sub num">
          {proj.retros.length} 份阶段复盘 · {proj.weekly_logs.length} 份周记
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => { setActive("weekly"); }}>
            <Icon name="refl" size={11} /> 周记
          </button>
          <button className="btn btn--primary" onClick={() => { setActive("phase"); setWizard(true); setStep(1); }}>
            <Icon name="promise" size={11} /> 阶段复盘 · 向导
          </button>
        </div>
      </div>

      <div className="pillbar">
        <div className="pill" aria-selected={active === "phase"} onClick={() => setActive("phase")}>
          <span className="caps">阶段复盘</span><span className="n num">{proj.retros.length}</span>
        </div>
        <div className="pill" aria-selected={active === "weekly"} onClick={() => setActive("weekly")}>
          <span className="caps">周记</span><span className="n num">{proj.weekly_logs.length}</span>
        </div>
      </div>

      {active === "phase" && !wizard && <PhaseRetroList proj={proj} />}
      {active === "phase" && wizard && (
        <PhaseRetroWizard proj={proj} step={step} setStep={setStep} onClose={() => setWizard(false)} />
      )}
      {active === "weekly" && <WeeklyLogList proj={proj} />}
    </div>
  );
};

function PhaseRetroList({ proj }) {
  const r = proj.retros[0]; if (!r) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
          <span className="mono t-xs ink-3 caps">复盘 · 提交于 {r.committed_at}</span>
          <span className="serif" style={{ fontSize: "var(--t-xl)", fontWeight: 600, letterSpacing: "-0.018em" }}>{r.segment_name}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 18,
                      paddingBottom: 12, borderBottom: "1px dashed var(--rule)" }}>
          <Stat n={r.metrics.commits}  label="提交" />
          <Stat n={r.metrics.logs}     label="日记" />
          <Stat n={r.metrics.learnings} label="心得" />
          <Stat n={r.metrics.bugs}     label="缺陷" />
          <Stat n={r.metrics.prompts}  label="提示" />
          <Stat n={r.metrics.planned_days} label="计划天" />
          <Stat n={r.metrics.drift_days} label="偏离天" deltaKind="down" delta={`${Math.round(r.metrics.drift_days/r.metrics.planned_days*100)}%`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 14 }}>
          <div>
            <BlockLabel>6 能力自评 · 1–5</BlockLabel>
            {Object.entries(r.scores).map(([k, v]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "110px 1fr 30px",
                                     gap: 10, alignItems: "center", padding: "4px 0",
                                     borderTop: "1px dashed var(--rule)" }}>
                <span className="mono t-xs caps ink-3">{SCORE_LABEL[k] || k}</span>
                <div className="tally">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`seg ${i < v ? "on" : ""}`} />
                  ))}
                </div>
                <span className="mono num">{v}</span>
              </div>
            ))}
          </div>
          <div>
            <BlockLabel>三问</BlockLabel>
            {r.three_questions.map((q, i) => (
              <div key={i} style={{ padding: "8px 0", borderTop: "1px dashed var(--rule)" }}>
                <div className="mono t-xs ink-3" style={{ marginBottom: 3 }}>Q{i + 1} · {q.q}</div>
                <div className="serif" style={{ fontSize: "var(--t-md)", lineHeight: 1.5 }}>{q.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--rule)" }}>
          <BlockLabel>Scope 调整 · 承认偏离,非辩解</BlockLabel>
          {r.scope_changes.map((s, i) => (
            <div key={i} className="serif" style={{ fontSize: "var(--t-md)", padding: "5px 0",
                  borderTop: i === 0 ? "none" : "1px dashed var(--rule)" }}>
              <span className="mono t-xs ink-3" style={{ marginRight: 8 }}>{i + 1}.</span>
              {s.change}
              <span className="ink-3"> — {s.reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const WIZARD_STEPS = [
  { t: "指标 · 先看数字，不允许绕过",
    s: "这些数字是 app 替你拉出来的。先看 5 秒再写别的。" },
  { t: "六项自评 · 1–5",
    s: "清晰度 / 诚实 / 产出 / 深度 / 自律 / 精力。上一阶段的分数会留着对比。" },
  { t: "三问 · 自己写",
    s: "AI 不会替你答这三题。不接受一句话敷衍。" },
  { t: "范围调整 · 承认偏离",
    s: "砍了什么 · 加了什么 · 为什么。非辩解，只记录。" },
  { t: "留钩子 · 下一阶段第一件事",
    s: "下一阶段第 1 天第一件事是什么。具体。" }
];

function PhaseRetroWizard({ proj, step, setStep, onClose }) {
  const r = proj.retros[0];
  return (
    <div className="card" style={{ padding: "18px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span className="mono t-xs ink-3 caps">阶段复盘 · 向导</span>
        <span className="serif" style={{ fontSize: "var(--t-lg)", fontWeight: 600, letterSpacing: "-0.015em" }}>
          第一阶段 — 渲染管线 · 收官
        </span>
        <button className="btn btn--ghost" style={{ marginLeft: "auto" }} onClick={onClose}>
          <Icon name="close" size={11} /> 退出
        </button>
      </div>

      {/* Step rail */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${WIZARD_STEPS.length}, 1fr)`, gap: 0, marginBottom: 14 }}>
        {WIZARD_STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step, cur = n === step;
          return (
            <div key={n} onClick={() => setStep(n)}
                 style={{
                   padding: "8px 10px",
                   borderTop: cur ? "2px solid var(--amber)" : done ? "2px solid var(--ink)" : "2px solid var(--rule)",
                   cursor: "pointer"
                 }}>
              <div className="mono t-xs ink-3 num" style={{ marginBottom: 2 }}>
                {n}/{WIZARD_STEPS.length} {done && <span style={{ color: "var(--done)" }}>✓</span>}
              </div>
              <div className="serif" style={{ fontSize: "var(--t-sm)", color: cur ? "var(--ink)" : "var(--ink-3)", lineHeight: 1.3 }}>
                {s.t.split(" · ")[0]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="serif" style={{ fontSize: "var(--t-xl)", fontWeight: 600, letterSpacing: "-0.018em", marginBottom: 4 }}>
        {WIZARD_STEPS[step - 1].t}
      </div>
      <div className="serif ink-3" style={{ fontSize: "var(--t-md)", marginBottom: 16 }}>
        {WIZARD_STEPS[step - 1].s}
      </div>

      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {Object.entries(r.metrics).map(([k, v]) => (
            <div key={k} className="card" style={{ padding: "10px 14px" }}>
              <div className="mono t-xs ink-3 caps">{METRIC_LABEL[k] || k.replace(/_/g, " ")}</div>
              <div className="mono" style={{ fontSize: "var(--t-2xl)", color: "var(--ink)" }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          {[
            ["clarity",   "清晰度"],
            ["honesty",   "诚实"],
            ["output",    "产出"],
            ["depth",     "深度"],
            ["discipline","自律"],
            ["energy",    "精力"]
          ].map(([k, label]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "130px 1fr 40px",
                                   gap: 12, alignItems: "center", padding: "8px 0",
                                   borderTop: "1px dashed var(--rule)" }}>
              <span className="serif t-md ink-2">{label}</span>
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="seg" style={{
                    height: 22, flex: 1, cursor: "pointer",
                    background: i < (r.scores[k] || 0) ? "var(--ink)" : "var(--paper-3)"
                  }} />
                ))}
              </div>
              <span className="mono num">{r.scores[k]}</span>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div>
          {r.three_questions.map((q, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>
                Q{i + 1} · {q.q}
              </label>
              <textarea className="textarea" defaultValue={q.a} rows={3} />
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div>
          {r.scope_changes.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "10px 0",
                                   borderTop: "1px dashed var(--rule)" }}>
              <input className="input" defaultValue={s.change} />
              <input className="input" defaultValue={s.reason} />
            </div>
          ))}
          <button className="btn" style={{ marginTop: 10 }}><Icon name="plus" size={11} /> 再加一条</button>
        </div>
      )}

      {step === 5 && (
        <div>
          <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>
            第二阶段 · 第 1 天第一件事
          </label>
          <input className="input" placeholder="具体到动作。『继续学习』不算。" />
          <div className="mono t-xs ink-4" style={{ marginTop: 8 }}>
            这条会被钉在第二阶段第 1 天的今日页 · 你不能假装没看见。
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--rule)",
                    display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono t-xs ink-4">检查项的勾选不入库 · 只有你写的字会被记下来</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>← 上一步</button>
          {step < WIZARD_STEPS.length
            ? <button className="btn btn--primary" onClick={() => setStep(step + 1)}>下一步 →</button>
            : <button className="btn btn--primary" onClick={onClose}>提交复盘 <Kbd>⌘↵</Kbd></button>}
        </div>
      </div>
    </div>
  );
}

function WeeklyLogList({ proj }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {proj.weekly_logs.map(w => (
        <div key={w.id} className="card" style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <span className="serif" style={{ fontSize: "var(--t-lg)", fontWeight: 600, letterSpacing: "-0.015em" }}>第 {w.week_n} 周</span>
            <span className="mono t-xs ink-3 num">{w.week_start} → {w.week_end} · 提交于 {w.committed_at}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
            <div>
              {w.reflections.map((r, i) => (
                <div key={i} style={{ padding: "5px 0", borderTop: i === 0 ? "none" : "1px dashed var(--rule)" }}>
                  <div className="mono t-xs ink-3">Q{i + 1} · {r.q}</div>
                  <div className="serif" style={{ fontSize: "var(--t-md)" }}>{r.a}</div>
                </div>
              ))}
            </div>
            <div>
              <BlockLabel>自评</BlockLabel>
              {Object.entries(w.scores).map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "90px 1fr 24px",
                                        gap: 10, alignItems: "center", padding: "3px 0" }}>
                  <span className="mono t-xs caps ink-3">{SCORE_LABEL[k] || k}</span>
                  <div className="tally">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`seg ${i < v ? "on" : ""}`} />
                    ))}
                  </div>
                  <span className="mono t-xs num">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

window.RetrosPage = RetrosPage;
