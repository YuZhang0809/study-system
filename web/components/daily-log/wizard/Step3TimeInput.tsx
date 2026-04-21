const PRESET_MINUTES = ["30", "60", "90", "120", "150", "180", "240"] as const;

interface Step3TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPreset: (value: string) => void;
  error?: string;
}

export function Step3TimeInput({ value, onChange, onSelectPreset, error }: Step3TimeInputProps) {
  return (
    <div className="wizard-step-panel">
      <label className="mono t-xs ink-3 caps wizard-field-label" htmlFor="wizard-time-spent">
        今日时长 · 分钟
      </label>

      <div className="wizard-time-row">
        <input
          id="wizard-time-spent"
          type="number"
          min={0}
          className="wizard-time-input mono"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="numeric"
        />
        <span className="mono ink-3 wizard-time-suffix">分钟</span>
      </div>

      <div className="wizard-presets">
        {PRESET_MINUTES.map((preset) => (
          <button key={preset} type="button" className="btn" onClick={() => onSelectPreset(preset)}>
            {preset}m
          </button>
        ))}
      </div>

      {error ? <p className="daily-log-error">{error}</p> : null}
    </div>
  );
}
