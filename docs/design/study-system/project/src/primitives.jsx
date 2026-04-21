// Small UI primitives shared across pages.
// All components export to window for cross-file use.

const { useState, useEffect, useRef, useMemo } = React;

// --- Date helpers ---
const todayStr = "2026-04-21";
const fmtDate = (s) => s;
const dayOfWeek = (s) => {
  const d = new Date(s + "T00:00:00");
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
};

// --- Icons: hand-drawn-looking inline SVG, 14px, stroke-based ---
const Icon = ({ name, size = 14, stroke = "currentColor" }) => {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 16 16", fill: "none",
                   stroke, strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round" };
  const P = (props) => <svg {...common}>{props.children}</svg>;
  switch (name) {
    case "today":     return <P><rect x="2.5" y="3.5" width="11" height="10"/><path d="M2.5 6.5h11M5 2v3M11 2v3M6 9l1.5 1.5L10 8"/></P>;
    case "plan":      return <P><path d="M3 3h10v10H3z M3 6h10 M6 3v10"/></P>;
    case "knowledge": return <P><path d="M3 3.5h7l3 2.5v7H3z M10 3.5V6.5H13"/></P>;
    case "retros":    return <P><path d="M3 13V3l5 4 5-4v10"/></P>;
    case "artifacts": return <P><path d="M4 4h6l2 2v6H4z M10 4v2h2"/></P>;
    case "settings":  return <P><circle cx="8" cy="8" r="1.5"/><path d="M8 2v1.5 M8 12.5V14 M2 8h1.5 M12.5 8H14 M3.8 3.8l1 1 M11.2 11.2l1 1 M12.2 3.8l-1 1 M4.8 11.2l-1 1"/></P>;
    case "plus":      return <P><path d="M8 3v10 M3 8h10"/></P>;
    case "search":    return <P><circle cx="7" cy="7" r="3.5"/><path d="M10 10l3 3"/></P>;
    case "chevron-r": return <P><path d="M6 3l4 5-4 5"/></P>;
    case "chevron-d": return <P><path d="M3 6l5 4 5-4"/></P>;
    case "close":     return <P><path d="M4 4l8 8 M12 4l-8 8"/></P>;
    case "check":     return <P><path d="M3 8l3 3 7-7"/></P>;
    case "link":      return <P><path d="M6 10l4-4 M7 4h4v4 M4 11h5"/></P>;
    case "dash":      return <P><path d="M3 8h10"/></P>;
    case "commit":    return <P><circle cx="8" cy="8" r="2.5"/><path d="M3 8h2.5 M10.5 8H13"/></P>;
    case "note":      return <P><path d="M4 3h6l2 2v8H4z M4 6.5h8 M4 9h8 M4 11.5h5"/></P>;
    case "bug":       return <P><path d="M5 6a3 3 0 016 0v3a3 3 0 01-6 0z M3 7h2 M11 7h2 M3 10h2 M11 10h2 M8 3V2"/></P>;
    case "prompt":    return <P><path d="M3 4h10v7H7l-3 2.5V11H3z"/></P>;
    case "concept":   return <P><circle cx="5" cy="5" r="1.5"/><circle cx="11" cy="5" r="1.5"/><circle cx="8" cy="11" r="1.5"/><path d="M5.8 6L7.3 9.8 M10.2 6L8.7 9.8 M6.2 5h3.6"/></P>;
    case "learning":  return <P><path d="M3 4.5l5-2 5 2v2l-5 2-5-2z M3 9.5l5 2 5-2 M8 6.5V13"/></P>;
    case "clock":     return <P><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/></P>;
    case "arrow-r":   return <P><path d="M3 8h10 M10 5l3 3-3 3"/></P>;
    case "blocker":   return <P><circle cx="8" cy="8" r="5.5"/><path d="M4.5 4.5l7 7"/></P>;
    case "refl":      return <P><path d="M3 8h10 M3 5l10 0 M3 11h10 M6 2l-2 3 2 3"/></P>;
    case "promise":   return <P><path d="M8 2l1.6 3.5L13 6l-2.5 2.4.6 3.6L8 10.3 4.9 12l.6-3.6L3 6l3.4-.5z"/></P>;
    default: return null;
  }
};

window.Icon = Icon;
window.todayStr = todayStr;
window.fmtDate = fmtDate;
window.dayOfWeek = dayOfWeek;

// --- Chip for knowledge type ---
const typeMeta = {
  learning: { label: "LEARNING", icon: "learning" },
  concept:  { label: "CONCEPT",  icon: "concept"  },
  bug:      { label: "BUG",      icon: "bug"      },
  prompt:   { label: "PROMPT",   icon: "prompt"   }
};
window.typeMeta = typeMeta;

const TypeTag = ({ type }) => {
  const m = typeMeta[type] || { label: type.toUpperCase(), icon: "note" };
  return (
    <span className="chip" style={{ gap: 4 }}>
      <Icon name={m.icon} size={11} />
      <span>{m.label}</span>
    </span>
  );
};
window.TypeTag = TypeTag;

// --- Kbd ---
const Kbd = ({ children }) => <span className="kbd">{children}</span>;
window.Kbd = Kbd;

// --- Stat card ---
const Stat = ({ n, label, delta, deltaKind }) => (
  <div className="stat">
    <div className="stat-n num">{n}</div>
    <div className="stat-l">{label}</div>
    {delta && <div className={`stat-delta ${deltaKind==='up'?'stat-delta--up':deltaKind==='down'?'stat-delta--down':''}`}>{delta}</div>}
  </div>
);
window.Stat = Stat;

// --- Section header inside a page ---
const BlockLabel = ({ children, count, right }) => (
  <div className="block-label">
    <span>{children}</span>
    {count !== undefined && <span className="count num">· {count}</span>}
    {right && <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>{right}</span>}
  </div>
);
window.BlockLabel = BlockLabel;
