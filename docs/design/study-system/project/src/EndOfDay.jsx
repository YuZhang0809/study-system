// End-of-day flow. Two variations: wizard (4 steps) and single-page (all fields at once).

const EndOfDay = function EndOfDay({ proj, mode, onClose }) {
  const [step, setStep] = React.useState(1);

  if (mode === "single") return <EndOfDaySingle proj={proj} onClose={onClose} />;
  return <EndOfDayWizard proj={proj} step={step} setStep={setStep} onClose={onClose} />;
};

function EndOfDayWizard({ proj, step, setStep, onClose }) {
  const snap = proj.today_snapshot;
  const steps = [
    { t: "做了什么 · 逐条", s: "一条一个动作。『学了东西』不算。", n: 1 },
    { t: "偏离 · 跳过/推迟", s: "承认。说原因,不找借口。", n: 2 },
    { t: "时间 · 诚实估计", s: "估到 15 分钟。高估低估都没意义。", n: 3 },
    { t: "明天第一件事 + 诚实便签", s: "明早 9 点要做的那件事。", n: 4 }
  ];
  const [done, setDone] = React.useState(snap.planned.map(t => false));
  const [skipped, setSkipped] = React.useState([{ text: "粒子 demo 的 benchmark 重跑", reason: "" }]);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 760 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <span className="mono t-xs ink-3 caps">收工 · 向导</span>
          <span className="serif" style={{ fontSize: "var(--t-lg)", fontWeight: 600, letterSpacing: "-0.015em" }}>
            daily_log · d{snap.day_index} · {snap.date}
          </span>
          <button className="btn btn--ghost" style={{ marginLeft: "auto" }} onClick={onClose}>
            <Icon name="close" size={11} /> <Kbd>Esc</Kbd>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, marginBottom: 16 }}>
          {steps.map(s => {
            const cur = s.n === step, past = s.n < step;
            return (
              <div key={s.n} onClick={() => setStep(s.n)} style={{
                padding: "8px 10px", cursor: "pointer",
                borderTop: cur ? "2px solid var(--amber)" : past ? "2px solid var(--ink)" : "2px solid var(--rule)"
              }}>
                <div className="mono t-xs ink-3 num">{s.n}/{steps.length} {past && <span style={{ color: "var(--done)" }}>✓</span>}</div>
                <div className="serif" style={{ fontSize: "var(--t-sm)", color: cur ? "var(--ink)" : "var(--ink-3)" }}>
                  {s.t.split(" · ")[0]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="serif" style={{ fontSize: "var(--t-xl)", fontWeight: 600, letterSpacing: "-0.018em" }}>{steps[step-1].t}</div>
        <div className="serif ink-3" style={{ fontSize: "var(--t-md)", marginBottom: 14 }}>{steps[step-1].s}</div>

        {step === 1 && (
          <div className="card--ruled card" style={{ padding: "6px 14px" }}>
            {snap.planned.map((t, i) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "14px 1fr",
                    gap: 10, padding: "8px 0", borderTop: i === 0 ? "none" : "1px dashed var(--rule)" }}>
                <span className={`check ${done[i] ? "check--done" : ""}`}
                      onClick={() => setDone(done.map((d, j) => j === i ? !d : d))}
                      style={{ cursor: "pointer", marginTop: 3 }} />
                <div className="serif" style={{ fontSize: "var(--t-md)",
                      textDecoration: done[i] ? "line-through" : "none",
                      color: done[i] ? "var(--ink-3)" : "var(--ink)" }}>
                  {t.text}
                </div>
              </div>
            ))}
            <div style={{ padding: "8px 0", borderTop: "1px dashed var(--rule)" }}>
              <input className="input" placeholder="+ 加一条(计划外的也写上)" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            {skipped.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "14px 2fr 2fr auto",
                    gap: 10, padding: "8px 0", borderTop: "1px dashed var(--rule)", alignItems: "start" }}>
                <span className="check check--drift" style={{ marginTop: 3 }} />
                <input className="input" defaultValue={s.text} placeholder="跳过了什么" />
                <input className="input" placeholder="原因 · 时间不够 / 换方向 / 逃避…" />
                <button className="btn btn--ghost"><Icon name="close" size={11} /></button>
              </div>
            ))}
            <button className="btn" onClick={() => setSkipped([...skipped, { text: "", reason: "" }])}
                    style={{ marginTop: 10 }}>
              <Icon name="plus" size={11} /> 再加一条
            </button>
            <div className="mono t-xs ink-4" style={{ marginTop: 12 }}>
              昨日承诺 2 条未兑现 · 会被自动归入这里的"推迟"
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>
              今日时长 · 分钟
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input className="mono"
                     defaultValue="175"
                     style={{
                       fontSize: "var(--t-3xl)", width: 120, border: "none",
                       borderBottom: "1px solid var(--rule-strong)", background: "transparent",
                       textAlign: "right", color: "var(--ink)", outline: "none"
                     }} />
              <span className="mono ink-3">分钟</span>
              <div style={{ marginLeft: 20, flex: 1 }} className="mono t-xs ink-3">
                最近 7 天均值 <span style={{ color: "var(--ink)" }}>168m</span> · 中位数 <span style={{ color: "var(--ink)" }}>155m</span>
              </div>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 6 }}>
              {["30","60","90","120","150","180","240"].map(v => (
                <button key={v} className="btn mono t-xs">{v}m</button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>
                明日第一件事 · 具体动作
              </label>
              <input className="input" autoFocus
                     placeholder="09:00 打开 particles/bench.ts,先跑 baseline 再改代码" />
              <div className="mono t-xs ink-4" style={{ marginTop: 4 }}>
                会钉在明早 Today 页顶 · 晚上 app 会问你做了没
              </div>
            </div>
            <div>
              <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>
                诚实日记 · 写给明早的自己 · 可以留空
              </label>
              <textarea className="textarea" rows={3}
                        placeholder="今天我没做到 X,因为… / 我在逃避 Y / 这个节奏还能扛几天?" />
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--rule)",
                      display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono t-xs ink-4">不写自由文本『今天想说什么』 · 结构化字段,就事论事</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>← back</button>
            {step < steps.length
              ? <button className="btn btn--primary" onClick={() => setStep(step + 1)}>next →</button>
              : <button className="btn btn--primary" onClick={onClose}>Commit log <Kbd>⌘↵</Kbd></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EndOfDaySingle({ proj, onClose }) {
  const snap = proj.today_snapshot;
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 820, maxHeight: "86vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <span className="mono t-xs ink-3 caps">收工 · 单页</span>
          <span className="serif" style={{ fontSize: "var(--t-lg)", fontWeight: 600, letterSpacing: "-0.015em" }}>
            daily_log · d{snap.day_index} · {snap.date} · {dayOfWeek(snap.date)}
          </span>
          <button className="btn btn--ghost" style={{ marginLeft: "auto" }} onClick={onClose}>
            <Icon name="close" size={11} /> <Kbd>Esc</Kbd>
          </button>
        </div>

        <div className="rule-break">§ Done</div>
        <div className="card--ruled card" style={{ padding: "6px 14px" }}>
          {snap.planned.map((t, i) => (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "14px 1fr",
                  gap: 10, padding: "6px 0", borderTop: i === 0 ? "none" : "1px dashed var(--rule)" }}>
              <span className="check" />
              <div className="serif" style={{ fontSize: "var(--t-md)" }}>{t.text}</div>
            </div>
          ))}
          <div style={{ padding: "6px 0", borderTop: "1px dashed var(--rule)" }}>
            <input className="input" placeholder="+ 加一条" />
          </div>
        </div>

        <div className="rule-break">§ Skipped / drift</div>
        <div style={{ display: "grid", gridTemplateColumns: "14px 2fr 2fr", gap: 10, padding: "6px 0" }}>
          <span className="check check--drift" />
          <input className="input" defaultValue="粒子 demo 的 benchmark 重跑" />
          <input className="input" placeholder="原因" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "14px 2fr 2fr", gap: 10, padding: "6px 0" }}>
          <span className="check check--drift" />
          <input className="input" placeholder="跳过了什么" />
          <input className="input" placeholder="原因" />
        </div>

        <div className="rule-break">§ Time / Tomorrow / Honesty</div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "start" }}>
          <div>
            <label className="mono t-xs ink-3 caps">今日时长 · 分钟</label>
            <input className="mono" defaultValue="175"
                   style={{ fontSize: "var(--t-2xl)", width: "100%", border: "none",
                            borderBottom: "1px solid var(--rule-strong)", background: "transparent",
                            color: "var(--ink)", outline: "none", paddingTop: 4 }} />
          </div>
          <div>
            <label className="mono t-xs ink-3 caps">明日第一件事</label>
            <input className="input" placeholder="09:00 打开 particles/bench.ts,先跑 baseline 再动代码" />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="mono t-xs ink-3 caps">Honesty note · 可以留空</label>
          <textarea className="textarea" rows={3}
                    placeholder="今天我没做到 X,因为… / 我在逃避 Y" />
        </div>

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--rule)",
                      display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono t-xs ink-4">所有字段都是结构化 · 留白是允许的 · 自欺不是</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn" onClick={onClose}>存为草稿</button>
            <button className="btn btn--primary" onClick={onClose}>提交日记 <Kbd>⌘↵</Kbd></button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.EndOfDay = EndOfDay;
