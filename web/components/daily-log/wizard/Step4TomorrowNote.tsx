interface Step4TomorrowNoteProps {
  tomorrowFirstThing: string;
  honestyNote: string;
  onTomorrowChange: (value: string) => void;
  onHonestyChange: (value: string) => void;
  tomorrowError?: string;
  honestyError?: string;
  onSubmitShortcut?: () => void;
}

export function Step4TomorrowNote({
  tomorrowFirstThing,
  honestyNote,
  onTomorrowChange,
  onHonestyChange,
  tomorrowError,
  honestyError,
  onSubmitShortcut,
}: Step4TomorrowNoteProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (event.key !== "Enter" && event.key !== "NumpadEnter") {
      return;
    }

    event.preventDefault();
    onSubmitShortcut?.();
  }

  return (
    <div className="wizard-step-panel wizard-step-panel--stacked">
      <div className="wizard-field">
        <label className="mono t-xs ink-3 caps" htmlFor="wizard-tomorrow-first">
          明日第一件事 · 具体动作
        </label>
        <input
          id="wizard-tomorrow-first"
          className="input"
          autoFocus
          value={tomorrowFirstThing}
          onChange={(event) => onTomorrowChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="09:00 打开 particles/bench.ts,先跑 baseline 再改代码"
          maxLength={240}
        />
        <p className="wizard-step-note mono t-xs ink-4">明早 /today 顶部会看到这句话</p>
        {tomorrowError ? <p className="daily-log-error">{tomorrowError}</p> : null}
      </div>

      <div className="wizard-field">
        <label className="mono t-xs ink-3 caps" htmlFor="wizard-honesty-note">
          诚实日记 · 写给明早的自己 · 可以留空
        </label>
        <textarea
          id="wizard-honesty-note"
          className="textarea"
          rows={3}
          value={honestyNote}
          onChange={(event) => onHonestyChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="今天我没做到 X,因为… / 我在逃避 Y / 这个节奏还能扛几天?"
          maxLength={2000}
        />
        {honestyError ? <p className="daily-log-error">{honestyError}</p> : null}
      </div>
    </div>
  );
}
