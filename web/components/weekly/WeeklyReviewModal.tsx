"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { upsertWeeklyLog, type WeeklyLogActionResult } from "@/lib/weekly-log/actions";
import {
  WEEKLY_QUESTION_COPY,
  WEEKLY_QUESTION_ORDER,
  WEEKLY_REFLECTION_MAX_LENGTH_ERROR,
  WEEKLY_REFLECTION_REQUIRED_ERROR,
  WEEKLY_SCORE_KEYS,
  WEEKLY_SCORE_LABEL,
  WEEKLY_SCORE_REQUIRED_ERROR,
  type WeeklyQuestionKey,
  type WeeklyScoreKey,
} from "@/lib/weekly-log/copy";
import { resizeTextarea } from "@/lib/ui/resize-textarea";
import type { WeeklyLogReflectionsInput, WeeklyLogSelfScoresInput } from "@/lib/schemas/weekly-log";
import { formatIsoDate } from "@/lib/today/driving-seat";
import { WeeklyScoresRow } from "./WeeklyScoresRow";

interface WeeklyReviewModalProps {
  projectId: string;
  weekStart: Date;
  weekEnd: Date;
  existingLog: {
    reflections: WeeklyLogReflectionsInput;
    selfScores: WeeklyLogSelfScoresInput;
  } | null;
  previousWeekQ6: string | null;
  onClose: () => void;
}

type ReflectionErrors = Partial<Record<WeeklyQuestionKey, string>>;
type ScoreErrors = Partial<Record<WeeklyScoreKey, string>>;

const MAX_TEXTAREA_HEIGHT = 192;

function buildInitialReflections(existingLog: WeeklyReviewModalProps["existingLog"]): WeeklyLogReflectionsInput {
  return {
    q1: existingLog?.reflections.q1 ?? "",
    q2: existingLog?.reflections.q2 ?? "",
    q3: existingLog?.reflections.q3 ?? "",
    q4: existingLog?.reflections.q4 ?? "",
    q5: existingLog?.reflections.q5 ?? "",
    q6: existingLog?.reflections.q6 ?? "",
  };
}

function buildInitialScores(
  existingLog: WeeklyReviewModalProps["existingLog"],
): Record<WeeklyScoreKey, number | null> {
  return {
    clarity: getInitialScore(existingLog?.selfScores.clarity),
    honesty: getInitialScore(existingLog?.selfScores.honesty),
    output: getInitialScore(existingLog?.selfScores.output),
    depth: getInitialScore(existingLog?.selfScores.depth),
    discipline: getInitialScore(existingLog?.selfScores.discipline),
    energy: getInitialScore(existingLog?.selfScores.energy),
  };
}

export function WeeklyReviewModal({
  projectId,
  weekStart,
  weekEnd,
  existingLog,
  previousWeekQ6,
  onClose,
}: WeeklyReviewModalProps) {
  const [reflections, setReflections] = useState(() => buildInitialReflections(existingLog));
  const [scores, setScores] = useState(() => buildInitialScores(existingLog));
  const [reflectionErrors, setReflectionErrors] = useState<ReflectionErrors>({});
  const [scoreErrors, setScoreErrors] = useState<ScoreErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const textareaRefs = useRef<Partial<Record<WeeklyQuestionKey, HTMLTextAreaElement | null>>>({});
  const scoreButtonRefs = useRef<Partial<Record<WeeklyScoreKey, HTMLButtonElement | null>>>({});

  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  });

  useEffect(() => {
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    for (const key of WEEKLY_QUESTION_ORDER) {
      const textarea = textareaRefs.current[key];

      if (textarea) {
        resizeTextarea(textarea);
      }
    }
  }, []);

  function clearMessages() {
    if (submitError) {
      setSubmitError(null);
    }

    if (Object.keys(reflectionErrors).length > 0) {
      setReflectionErrors({});
    }

    if (Object.keys(scoreErrors).length > 0) {
      setScoreErrors({});
    }
  }

  function handleReflectionChange(key: WeeklyQuestionKey, value: string) {
    clearMessages();
    setReflections((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleScoreChange(key: WeeklyScoreKey, value: number) {
    clearMessages();
    setScores((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit() {
    clearMessages();

    startTransition(() => {
      void submit();
    });
  }

  async function submit() {
    const nextReflectionErrors: ReflectionErrors = {};
    const nextScoreErrors: ScoreErrors = {};
    const trimmedReflections = { ...reflections };

    for (const key of WEEKLY_QUESTION_ORDER) {
      const trimmed = reflections[key].trim();
      trimmedReflections[key] = trimmed;

      if (!trimmed) {
        nextReflectionErrors[key] = WEEKLY_REFLECTION_REQUIRED_ERROR;
        continue;
      }

      if (trimmed.length > 2000) {
        nextReflectionErrors[key] = WEEKLY_REFLECTION_MAX_LENGTH_ERROR;
      }
    }

    for (const key of WEEKLY_SCORE_KEYS) {
      if (scores[key] === null) {
        nextScoreErrors[key] = WEEKLY_SCORE_REQUIRED_ERROR;
      }
    }

    if (Object.keys(nextReflectionErrors).length > 0 || Object.keys(nextScoreErrors).length > 0) {
      setReflectionErrors(nextReflectionErrors);
      setScoreErrors(nextScoreErrors);
      focusFirstError(nextReflectionErrors, nextScoreErrors, textareaRefs.current, scoreButtonRefs.current);
      return;
    }

    try {
      const result = await upsertWeeklyLog({
        projectId,
        weekStart: formatIsoDate(weekStart),
        reflections: trimmedReflections,
        selfScores: scores as Record<WeeklyScoreKey, number>,
      });

      if (!result.ok) {
        const mappedReflectionErrors = mapReflectionErrors(result);
        const mappedScoreErrors = mapScoreErrors(result);
        setReflectionErrors(mappedReflectionErrors);
        setScoreErrors(mappedScoreErrors);
        setSubmitError(getSubmitError(result));
        focusFirstError(mappedReflectionErrors, mappedScoreErrors, textareaRefs.current, scoreButtonRefs.current);
        return;
      }

      onClose();
    } catch {
      setSubmitError("提交失败，请稍后再试。");
    }
  }

  return (
    <div
      className="wizard-scrim"
      style={{ background: "oklch(0.22 0.012 60 / 0.5)" }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="card wizard-modal"
        style={{ width: "min(860px, 100%)", maxHeight: "calc(100vh - 80px)", background: "var(--paper)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-review-title"
      >
        <div className="wizard-head" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="wizard-kicker mono t-xs ink-3 caps">复盘 · 本周</div>
            <h2 id="weekly-review-title" className="wizard-title serif" style={{ fontSize: "var(--t-xl)" }}>
              {formatIsoDate(weekStart)} → {formatIsoDate(weekEnd)}
            </h2>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {WEEKLY_QUESTION_ORDER.map((key, index) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor={key} className="mono t-xs ink-3 caps">
                  Q{index + 1} · {WEEKLY_QUESTION_COPY[key]}
                </label>
                {key === "q4" && previousWeekQ6 ? (
                  <div className="mono t-xs ink-3" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    上周 Q6 · {previousWeekQ6}
                  </div>
                ) : null}
                <textarea
                  id={key}
                  ref={(node) => {
                    textareaRefs.current[key] = node;
                  }}
                  className="textarea"
                  rows={3}
                  value={reflections[key]}
                  onChange={(event) => handleReflectionChange(key, event.target.value)}
                  onInput={(event) => resizeTextarea(event.currentTarget)}
                  style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: "auto" }}
                />
                {reflectionErrors[key] ? <p className="daily-log-error">{reflectionErrors[key]}</p> : null}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {WEEKLY_SCORE_KEYS.map((key, index) => (
              <div
                key={key}
                style={{
                  padding: "6px 0",
                  borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
                }}
              >
                <WeeklyScoresRow
                  label={WEEKLY_SCORE_LABEL[key]}
                  labelId={`weekly-score-${key}`}
                  value={scores[key]}
                  error={scoreErrors[key] ?? null}
                  referenceLine={undefined}
                  onChange={(value) => handleScoreChange(key, value)}
                  firstButtonRef={(node) => {
                    scoreButtonRefs.current[key] = node;
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {submitError ? (
          <p className="daily-log-error" style={{ marginTop: 14 }}>
            {submitError}
          </p>
        ) : null}

        <div className="wizard-footer">
          <p className="wizard-footer-note mono t-xs ink-4">就事论事 · 不写『这周感觉怎样』这种自由文本</p>
          <div className="wizard-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn btn--amber" onClick={handleSubmit} disabled={isPending}>
              <span>{isPending ? "提交中…" : existingLog ? "保存修改" : "提交本周"}</span>
              <span className="kbd">⌘↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getInitialScore(value: number | undefined): number | null {
  return typeof value === "number" && value >= 1 && value <= 5 ? value : null;
}

function mapReflectionErrors(result: Extract<WeeklyLogActionResult, { ok: false }>): ReflectionErrors {
  return {
    q1: result.fieldErrors.reflections?.q1?.[0],
    q2: result.fieldErrors.reflections?.q2?.[0],
    q3: result.fieldErrors.reflections?.q3?.[0],
    q4: result.fieldErrors.reflections?.q4?.[0],
    q5: result.fieldErrors.reflections?.q5?.[0],
    q6: result.fieldErrors.reflections?.q6?.[0],
  };
}

function mapScoreErrors(result: Extract<WeeklyLogActionResult, { ok: false }>): ScoreErrors {
  return {
    clarity: result.fieldErrors.selfScores?.clarity?.[0],
    honesty: result.fieldErrors.selfScores?.honesty?.[0],
    output: result.fieldErrors.selfScores?.output?.[0],
    depth: result.fieldErrors.selfScores?.depth?.[0],
    discipline: result.fieldErrors.selfScores?.discipline?.[0],
    energy: result.fieldErrors.selfScores?.energy?.[0],
  };
}

function getSubmitError(result: Extract<WeeklyLogActionResult, { ok: false }>): string | null {
  return result.fieldErrors.projectId?.[0] ?? result.fieldErrors.weekStart?.[0] ?? null;
}

function focusFirstError(
  reflectionErrors: ReflectionErrors,
  scoreErrors: ScoreErrors,
  textareas: Partial<Record<WeeklyQuestionKey, HTMLTextAreaElement | null>>,
  scoreButtons: Partial<Record<WeeklyScoreKey, HTMLButtonElement | null>>,
) {
  for (const key of WEEKLY_QUESTION_ORDER) {
    if (reflectionErrors[key]) {
      textareas[key]?.focus();
      return;
    }
  }

  for (const key of WEEKLY_SCORE_KEYS) {
    if (scoreErrors[key]) {
      scoreButtons[key]?.focus();
      return;
    }
  }
}
