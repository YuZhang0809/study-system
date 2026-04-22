"use client";

import { useRef } from "react";

interface WeeklyScoresRowProps {
  label: string;
  labelId: string;
  value: number | null;
  error: string | null;
  onChange: (value: number) => void;
  firstButtonRef?: (node: HTMLButtonElement | null) => void;
}

export function WeeklyScoresRow({
  label,
  labelId,
  value,
  error,
  onChange,
  firstButtonRef,
}: WeeklyScoresRowProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      buttonRefs.current[Math.min(index + 1, 4)]?.focus();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      buttonRefs.current[Math.max(index - 1, 0)]?.focus();
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onChange(index + 1);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 24px", gap: 10, alignItems: "center" }}>
        <span id={labelId} className="mono t-xs caps ink-3">
          {label}
        </span>
        <div className="tally" role="group" aria-labelledby={labelId}>
          {Array.from({ length: 5 }).map((_, index) => (
            <button
              key={index}
              ref={(node) => {
                buttonRefs.current[index] = node;

                if (index === 0) {
                  firstButtonRef?.(node);
                }
              }}
              type="button"
              className={`seg${value !== null && value >= index + 1 ? " on" : ""}`}
              aria-label={`${label} ${index + 1}`}
              aria-pressed={value === index + 1}
              onClick={() => onChange(index + 1)}
              onKeyDown={(event) => handleKeyDown(index, event)}
            />
          ))}
        </div>
        <span className="mono t-xs num">{value ?? "—"}</span>
      </div>
      {error ? (
        <p className="daily-log-error" style={{ marginLeft: 100 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
