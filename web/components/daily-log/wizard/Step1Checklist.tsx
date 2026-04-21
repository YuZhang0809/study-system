interface Step1ChecklistEntry {
  id: string;
  text: string;
  checked: boolean;
}

interface Step1ChecklistProps {
  entries: Step1ChecklistEntry[];
  draftValue: string;
  onDraftChange: (value: string) => void;
  onCommitDraft: () => void;
  onToggle: (id: string) => void;
  doneError?: string;
  skippedError?: string;
}

export function Step1Checklist({
  entries,
  draftValue,
  onDraftChange,
  onCommitDraft,
  onToggle,
  doneError,
  skippedError,
}: Step1ChecklistProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onCommitDraft();
  }

  return (
    <div className="wizard-step-panel">
      <div className="card card--ruled wizard-checklist-card">
        <div className="wizard-checklist-rows">
          {entries.map((entry) => (
            <div key={entry.id} className="wizard-check-row">
              <button
                type="button"
                className={`check${entry.checked ? " check--done" : ""}`}
                onClick={() => onToggle(entry.id)}
                aria-pressed={entry.checked}
                aria-label={`${entry.checked ? "取消完成" : "标记完成"}：${entry.text}`}
              />
              <div className={`wizard-check-text serif${entry.checked ? " is-checked" : ""}`}>{entry.text}</div>
            </div>
          ))}

          <div className="wizard-add-row">
            <input
              className="input"
              value={draftValue}
              onChange={(event) => onDraftChange(event.target.value)}
              onBlur={onCommitDraft}
              onKeyDown={handleKeyDown}
              placeholder="+ 加一条(计划外的也写上)"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {doneError ? <p className="daily-log-error">{doneError}</p> : null}
      {skippedError ? <p className="daily-log-error">{skippedError}</p> : null}
    </div>
  );
}
