interface Step2SkippedEntry {
  id: string;
  text: string;
}

interface Step2SkippedListProps {
  entries: Step2SkippedEntry[];
  onAddRow: () => void;
  onChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  error?: string;
}

export function Step2SkippedList({
  entries,
  onAddRow,
  onChange,
  onRemove,
  error,
}: Step2SkippedListProps) {
  return (
    <div className="wizard-step-panel">
      <div className="wizard-skipped-list">
        {entries.map((entry) => (
          <div key={entry.id} className="wizard-skipped-row">
            <input
              className="input"
              value={entry.text}
              onChange={(event) => onChange(entry.id, event.target.value)}
              placeholder="跳过了什么"
              maxLength={200}
            />
            <button type="button" className="btn btn--ghost wizard-remove" onClick={() => onRemove(entry.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn" onClick={onAddRow}>
        + 再加一条
      </button>
      <p className="wizard-step-note mono t-xs ink-4">昨日承诺会预填第一行 · 不想承认就删掉</p>
      {error ? <p className="daily-log-error">{error}</p> : null}
    </div>
  );
}
