// Knowledge page — list + filters + 3 input form variations (inline, modal, drawer).

const KnowledgePage = function KnowledgePage({ proj, inputMode }) {
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState(null); // {mode: 'inline'|'modal'|'drawer'}
  const [draftType, setDraftType] = React.useState("learning");

  const items = proj.knowledge.filter(k =>
    (filter === "all" || k.type === filter) &&
    (q === "" || k.title.toLowerCase().includes(q.toLowerCase()) ||
     k.tags.some(t => t.toLowerCase().includes(q.toLowerCase())))
  );

  const counts = {
    all: proj.knowledge.length,
    learning: proj.knowledge.filter(k => k.type === "learning").length,
    concept:  proj.knowledge.filter(k => k.type === "concept").length,
    bug:      proj.knowledge.filter(k => k.type === "bug").length,
    prompt:   proj.knowledge.filter(k => k.type === "prompt").length
  };

  const openNew = (type) => {
    setDraftType(type);
    setSelected({ mode: inputMode, type });
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">知识库</h1>
        <span className="page-sub num">{proj.knowledge.length} 条 · {proj.stats.learnings} 心得 · {proj.stats.concepts} 概念 · {proj.stats.bugs} 缺陷 · {proj.stats.prompts} 提示词</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => openNew("learning")}><Icon name="learning" size={11}/> +learning</button>
          <button className="btn" onClick={() => openNew("concept")}><Icon name="concept" size={11}/> +concept</button>
          <button className="btn" onClick={() => openNew("bug")}><Icon name="bug" size={11}/> +bug</button>
          <button className="btn btn--primary" onClick={() => openNew("prompt")}><Icon name="prompt" size={11}/> +prompt <Kbd>N</Kbd></button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div className="pillbar" style={{ flex: 1, marginBottom: 0 }}>
          {["all","learning","concept","bug","prompt"].map(t => (
            <div key={t} className="pill" aria-selected={filter === t} onClick={() => setFilter(t)}>
              <span className="caps">{t}</span>
              <span className="n num">{counts[t]}</span>
            </div>
          ))}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--rule)", padding: "4px 0", width: 260
        }}>
          <Icon name="search" size={12} stroke="var(--ink-3)" />
          <input className="input" style={{ border: "none", padding: 0 }}
                 placeholder="搜标题 / 标签…"
                 value={q} onChange={e => setQ(e.target.value)} />
          <Kbd>/</Kbd>
        </div>
      </div>

      {/* Inline compose — shown at top if inputMode === 'inline' and selected active */}
      {inputMode === "inline" && selected && (
        <div className="card" style={{ marginBottom: 16, padding: "12px 16px", borderTop: "2px solid var(--amber)" }}>
          <KnowledgeForm type={draftType} onType={setDraftType} onClose={() => setSelected(null)} compact />
        </div>
      )}

      {/* List */}
      <table className="ledger">
        <thead>
          <tr>
            <th style={{ width: 92 }}>类型</th>
            <th style={{ width: 80 }}>ID</th>
            <th>标题</th>
            <th style={{ width: 200 }}>标签</th>
            <th style={{ width: 86 }}>更新于</th>
            <th style={{ width: 50, textAlign: "right" }}>产出</th>
            <th style={{ width: 50, textAlign: "right" }}>关联</th>
          </tr>
        </thead>
        <tbody>
          {items.map(k => (
            <tr key={k.id}>
              <td><TypeTag type={k.type} /></td>
              <td className="mono ink-3 num">{k.id}</td>
              <td>
                <div className="serif" style={{ fontSize: "var(--t-md)", lineHeight: 1.35 }}>{k.title}</div>
                <div className="serif ink-3" style={{ fontSize: "var(--t-sm)", lineHeight: 1.4, marginTop: 2 }}>
                  {k.excerpt}
                </div>
              </td>
              <td>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {k.tags.map(t => <span key={t} className="chip">#{t}</span>)}
                </div>
              </td>
              <td className="mono ink-3 num">{k.updated_at.slice(5)}</td>
              <td className="mono ink-3 num" style={{ textAlign: "right" }}>{k.artifacts || "—"}</td>
              <td className="mono ink-3 num" style={{ textAlign: "right" }}>{k.linked || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {inputMode === "modal" && selected && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal">
            <KnowledgeForm type={draftType} onType={setDraftType} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}

      {/* Drawer */}
      {inputMode === "drawer" && selected && (
        <>
          <div className="drawer-scrim" onClick={() => setSelected(null)} />
          <aside className="drawer">
            <KnowledgeForm type={draftType} onType={setDraftType} onClose={() => setSelected(null)} drawer />
          </aside>
        </>
      )}
    </div>
  );
};

function KnowledgeForm({ type, onType, onClose, compact, drawer }) {
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [tags, setTags] = React.useState([]);
  const [body, setBody] = React.useState("");
  const [artifact, setArtifact] = React.useState("");

  // auto-slug as user types (form-level AI, allowed)
  React.useEffect(() => {
    if (!title) return setSlug("");
    const s = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim().split(/\s+/).slice(0, 5).join("-");
    setSlug(s);
  }, [title]);

  const typeOpts = ["learning", "concept", "bug", "prompt"];

  // Suggested related
  const related = React.useMemo(() => {
    if (!title) return [];
    const seed = window.SEED.projects.find(p => p.id === "p_webgpu");
    return seed.knowledge.slice(0, 2).map(k => ({ id: k.id, title: k.title, type: k.type }));
  }, [title]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: compact ? 8 : 14 }}>
        <div style={{ display: "flex", border: "1px solid var(--rule-strong)", borderRadius: 2 }}>
          {typeOpts.map((t, i) => (
            <button key={t}
              onClick={() => onType(t)}
              className="mono t-xs caps"
              style={{
                padding: "4px 8px",
                background: type === t ? "var(--ink)" : "var(--paper)",
                color: type === t ? "var(--paper)" : "var(--ink-3)",
                borderRight: i < 3 ? "1px solid var(--rule)" : "none",
                display: "flex", alignItems: "center", gap: 4
              }}>
              <Icon name={typeMeta[t].icon} size={10} />
              {t}
            </button>
          ))}
        </div>
        <span className="mono t-xs ink-3 caps">新条 · 草稿</span>
        <button className="btn btn--ghost" style={{ marginLeft: "auto" }} onClick={onClose}>
          <Icon name="close" size={11} /> 取消 <Kbd>Esc</Kbd>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: drawer ? "1fr" : compact ? "2fr 1fr" : "2fr 1fr", gap: 20 }}>
        <div>
          <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 3 }}>标题</label>
          <input className="input" autoFocus placeholder="一句话: 这条心得在讲什么"
                 value={title} onChange={e => setTitle(e.target.value)} />

          <div style={{ marginTop: 12 }}>
            <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 3 }}>
              正文 · 你自己写（AI 不会替你写）
            </label>
            <textarea className="textarea" rows={compact ? 3 : 6}
                      placeholder={
                        type === "learning" ? "我原本以为…  实际上是…  所以…" :
                        type === "concept"  ? "定义 · 最小例子 · 常见误解" :
                        type === "bug"      ? "现象 · 复现步骤 · 根因 · 规避" :
                        "提示词正文 · 适用场景 · 注意事项"
                      }
                      value={body} onChange={e => setBody(e.target.value)} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 3 }}>
              产出指针 · 外部产出（URL / 本地路径）
            </label>
            <input className="input" placeholder="https://github.com/…/commit/abc123  —  或  screenshots/2026-04-21/safari-sb.png"
                   value={artifact} onChange={e => setArtifact(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>标识 · 自动 · 可改</label>
            <div className="mono t-sm ink-2" style={{
              padding: "5px 8px", border: "1px dashed var(--rule-strong)", background: "var(--paper-2)"
            }}>
              {slug || <span className="ink-4">— 等标题 —</span>}
            </div>
          </div>

          <div>
            <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>标签</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {tags.map(t => (
                <span key={t} className="chip chip--amber">#{t}
                  <span onClick={() => setTags(tags.filter(x => x !== t))}
                        style={{ cursor: "pointer", marginLeft: 2 }}>×</span>
                </span>
              ))}
              <input className="mono t-xs"
                     placeholder="+ 标签 ↵"
                     style={{ border: "none", background: "transparent", outline: "none", minWidth: 60 }}
                     onKeyDown={(e) => {
                       if (e.key === "Enter" && e.target.value) {
                         setTags([...tags, e.target.value.trim()]);
                         e.target.value = "";
                       }
                     }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <span className="mono t-xs ink-4">推荐:</span>
              {["webgpu","mental-model","alignment"].map(t => (
                <span key={t} className="chip" style={{ cursor: "pointer", color: "var(--ink-3)" }}
                      onClick={() => !tags.includes(t) && setTags([...tags, t])}>+#{t}</span>
              ))}
            </div>
          </div>

          {related.length > 0 && (
            <div>
              <label className="mono t-xs ink-3 caps" style={{ display: "block", marginBottom: 4 }}>
                已有相关 · 要不要关联
              </label>
              {related.map(r => (
                <div key={r.id} className="serif" style={{
                  fontSize: "var(--t-sm)", padding: "4px 0",
                  borderTop: "1px dashed var(--rule)", display: "flex", alignItems: "center", gap: 6
                }}>
                  <Icon name="link" size={11} stroke="var(--ink-3)" />
                  <span className="mono t-xs ink-3">{r.id}</span>
                  <span style={{ flex: 1 }}>{r.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--rule)",
                    display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono t-xs ink-4">
          AI 只帮你生成标识 / 推荐标签 / 找关联 · 正文你自己写
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn" onClick={onClose}>存为草稿</button>
          <button className="btn btn--primary" onClick={onClose}>提交 <Kbd>⌘↵</Kbd></button>
        </div>
      </div>
    </div>
  );
}

window.KnowledgePage = KnowledgePage;
