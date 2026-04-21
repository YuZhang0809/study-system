"use client";

import { useState } from "react";

interface ChipEditorProps {
  label: string;
  name: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  maxItems: number;
  maxLength: number;
  autoFocus?: boolean;
  errors?: string[];
}

export function ChipEditor({
  label,
  name,
  values,
  onChange,
  placeholder,
  maxItems,
  maxLength,
  autoFocus = false,
  errors,
}: ChipEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function addChip() {
    const candidate = inputValue.trim();

    if (!candidate) {
      return;
    }

    if (candidate.length > maxLength) {
      setLocalError(`单项最多 ${maxLength} 字。`);
      return;
    }

    if (values.length >= maxItems) {
      setLocalError(`最多 ${maxItems} 项。`);
      return;
    }

    onChange([...values, candidate]);
    setInputValue("");
    setLocalError(null);
  }

  function removeChip(index: number) {
    onChange(values.filter((_, valueIndex) => valueIndex !== index));
    setLocalError(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addChip();
  }

  return (
    <div className="daily-log-field">
      <span className="mono t-xs ink-3 caps">{label}</span>
      {values.map((value, index) => (
        <input key={`${name}-${index}-${value}`} type="hidden" name={name} value={value} />
      ))}

      <div className="daily-chip-row">
        {values.map((value, index) => (
          <span key={`${value}-${index}`} className="chip chip--amber">
            <span>{value}</span>
            <button type="button" className="daily-chip-remove" onClick={() => removeChip(index)}>
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="daily-chip-input-row">
        <input
          className="input daily-chip-input"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            if (localError) {
              setLocalError(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        <button type="button" className="btn" onClick={addChip}>
          添加
        </button>
      </div>

      {localError ? <p className="daily-log-error">{localError}</p> : null}
      {errors?.[0] ? <p className="daily-log-error">{errors[0]}</p> : null}
    </div>
  );
}
