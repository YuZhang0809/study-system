"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { upsertRetro, type RetroActionResult } from "@/lib/retro/actions";
import {
  HOOK_MAX_LENGTH_ERROR,
  HOOK_REQUIRED_ERROR,
  REFLECTION_MAX_LENGTH_ERROR,
  REFLECTION_REQUIRED_ERROR,
  RETRO_METRIC_KEYS,
  RETRO_METRIC_LABEL,
  RETRO_SCORE_KEYS,
  RETRO_SCORE_LABEL,
  RETRO_THREE_QUESTION_COPY,
  RETRO_THREE_QUESTION_ORDER,
  RETRO_WIZARD_STEPS,
  SCORE_REQUIRED_ERROR,
  SCOPE_FIELD_MAX_LENGTH_ERROR,
  SCOPE_FIELD_REQUIRED_ERROR,
  type RetroScoreKey,
  type RetroThreeQuestionKey,
} from "@/lib/retro/copy";
import type {
  RetroMetricsInput,
  RetroScopeChangeInput,
  RetroSelfScoresInput,
  RetroThreeQuestionsInput,
} from "@/lib/schemas/retro";
import { resizeTextarea } from "@/lib/ui/resize-textarea";
import type { RetroSegmentLike } from "@/lib/retro/presentation";
import { RetroScoresRow } from "./RetroScoresRow";

interface PhaseRetroWizardProps {
  segment: RetroSegmentLike;
  metrics: RetroMetricsInput;
  previousScores: RetroSelfScoresInput | null;
  onExit: () => void;
}

type ScoreState = Record<RetroScoreKey, number | null>;
type QuestionState = Record<RetroThreeQuestionKey, string>;
type QuestionErrors = Partial<Record<RetroThreeQuestionKey, string>>;
type ScoreErrors = Partial<Record<RetroScoreKey, string>>;
type ScopeDraft = { id: number; change: string; reason: string };
type ScopeErrors = Array<Partial<Record<keyof RetroScopeChangeInput, string>> | undefined>;

const MAX_TEXTAREA_HEIGHT = 192;

export function PhaseRetroWizard({
  segment,
  metrics,
  previousScores,
  onExit,
}: PhaseRetroWizardProps) {
  const [step, setStep] = useState(1);
  const [scores, setScores] = useState<ScoreState>(createEmptyScores);
  const [threeQuestions, setThreeQuestions] = useState<QuestionState>(createEmptyQuestions);
  const [scopeChanges, setScopeChanges] = useState<ScopeDraft[]>([]);
  const [nextPhaseFirstThing, setNextPhaseFirstThing] = useState("");
  const [questionErrors, setQuestionErrors] = useState<QuestionErrors>({});
  const [scoreErrors, setScoreErrors] = useState<ScoreErrors>({});
  const [scopeErrors, setScopeErrors] = useState<ScopeErrors>([]);
  const [hookError, setHookError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextScopeId = useRef(0);
  const textareaRefs = useRef<Partial<Record<RetroThreeQuestionKey, HTMLTextAreaElement | null>>>({});
  const scoreButtonRefs = useRef<Partial<Record<RetroScoreKey, HTMLButtonElement | null>>>({});
  const scopeInputRefs = useRef<Array<{ change: HTMLInputElement | null; reason: HTMLInputElement | null }>>([]);
  const hookInputRef = useRef<HTMLInputElement | null>(null);

  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      handleExit();
    }
  });

  useEffect(() => {
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (step !== 3) {
      return;
    }

    for (const key of RETRO_THREE_QUESTION_ORDER) {
      const textarea = textareaRefs.current[key];

      if (textarea) {
        resizeTextarea(textarea, MAX_TEXTAREA_HEIGHT);
      }
    }
  }, [step]);

  function handleExit() {
    if (hasDraftText(threeQuestions, scopeChanges, nextPhaseFirstThing)) {
      const confirmed = window.confirm("退出会丢掉还没提交的内容。确定退出?");

      if (!confirmed) {
        return;
      }
    }

    onExit();
  }

  function clearMessages() {
    if (submitError) {
      setSubmitError(null);
    }

    if (hookError) {
      setHookError(null);
    }

    if (Object.keys(questionErrors).length > 0) {
      setQuestionErrors({});
    }

    if (Object.keys(scoreErrors).length > 0) {
      setScoreErrors({});
    }

    if (scopeErrors.length > 0) {
      setScopeErrors([]);
    }
  }

  function handleSubmit() {
    clearMessages();

    startTransition(() => {
      void submit();
    });
  }

  async function submit() {
    const validation = validateRetroDraft(scores, threeQuestions, scopeChanges, nextPhaseFirstThing);

    if (!validation.isValid) {
      setScoreErrors(validation.scoreErrors);
      setQuestionErrors(validation.questionErrors);
      setScopeErrors(validation.scopeErrors);
      setHookError(validation.hookError);
      setStep(validation.errorStep);
      focusFirstError(validation.errorStep, validation.scoreErrors, validation.questionErrors, validation.scopeErrors);
      return;
    }

    try {
      const result = await upsertRetro({
        segmentId: segment.id,
        metrics,
        selfScores: validation.selfScores,
        threeQuestions: validation.threeQuestions,
        scopeChanges: validation.scopeChanges,
        nextPhaseFirstThing: validation.nextPhaseFirstThing,
      });

      if (!result.ok) {
        const mappedScoreErrors = mapScoreErrors(result);
        const mappedQuestionErrors = mapQuestionErrors(result);
        const mappedScopeErrors = mapScopeErrors(result, scopeChanges.length);
        const mappedHookError = result.fieldErrors.nextPhaseFirstThing?.[0] ?? null;
        const errorStep = getErrorStep(
          result,
          mappedScoreErrors,
          mappedQuestionErrors,
          mappedScopeErrors,
          mappedHookError,
        );

        setScoreErrors(mappedScoreErrors);
        setQuestionErrors(mappedQuestionErrors);
        setScopeErrors(mappedScopeErrors);
        setHookError(mappedHookError);
        setSubmitError(getSubmitError(result));
        setStep(errorStep);
        focusFirstError(errorStep, mappedScoreErrors, mappedQuestionErrors, mappedScopeErrors);
        return;
      }

      onExit();
    } catch {
      setSubmitError("提交失败，请稍后再试。");
    }
  }

  const activeStep = RETRO_WIZARD_STEPS[step - 1];

  return (
    <div className="card" style={{ padding: "18px 22px" }}>
      <div className="wizard-head" style={{ alignItems: "flex-end" }}>
        <div>
          <div className="wizard-kicker mono t-xs ink-3 caps">阶段复盘 · 向导</div>
          <h2 className="wizard-title serif" style={{ fontSize: "var(--t-lg)" }}>
            第 {segment.order} 阶段 — {segment.name} · 收官
          </h2>
        </div>
        <button type="button" className="btn btn--ghost wizard-close" onClick={handleExit}>
          退出
        </button>
      </div>

      <div
        className="wizard-steps"
        role="tablist"
        aria-label="阶段复盘步骤"
        style={{ gridTemplateColumns: `repeat(${RETRO_WIZARD_STEPS.length}, minmax(0, 1fr))` }}
      >
        {RETRO_WIZARD_STEPS.map((wizardStep, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === step;
          const isPast = stepNumber < step;

          return (
            <button
              key={wizardStep.t}
              type="button"
              className={`wizard-step${isActive ? " is-active" : ""}${isPast ? " is-past" : ""}`}
              onClick={() => setStep(stepNumber)}
              role="tab"
              aria-selected={isActive}
            >
              <div className="wizard-step-index mono t-xs ink-3">
                {stepNumber}/{RETRO_WIZARD_STEPS.length}
                {isPast ? <span className="wizard-step-check">✓</span> : null}
              </div>
              <div className="wizard-step-title serif">{wizardStep.t.split(" · ")[0]}</div>
            </button>
          );
        })}
      </div>

      <div className="wizard-body">
        <h3 className="wizard-section-title serif">{activeStep.t}</h3>
        <p className="wizard-section-subtitle serif">{activeStep.s}</p>

        {step === 1 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 18,
            }}
          >
            {RETRO_METRIC_KEYS.map((key) => (
              <div key={key} className="card" style={{ padding: "10px 14px" }}>
                <div className="mono t-xs ink-3 caps">{RETRO_METRIC_LABEL[key]}</div>
                <div className="mono" style={{ fontSize: "var(--t-2xl)", color: "var(--ink)" }}>
                  {metrics[key]}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RETRO_SCORE_KEYS.map((key, index) => (
              <div
                key={key}
                style={{
                  padding: "8px 0",
                  borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
                }}
              >
                <RetroScoresRow
                  label={RETRO_SCORE_LABEL[key]}
                  labelId={`retro-score-${key}`}
                  value={scores[key]}
                  error={scoreErrors[key] ?? null}
                  referenceLine={
                    previousScores ? `上阶段 ${RETRO_SCORE_LABEL[key]} · ${previousScores[key]}` : undefined
                  }
                  onChange={(value) => {
                    clearMessages();
                    setScores((current) => ({ ...current, [key]: value }));
                  }}
                  firstButtonRef={(node) => {
                    scoreButtonRefs.current[key] = node;
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {RETRO_THREE_QUESTION_ORDER.map((key, index) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor={key} className="mono t-xs ink-3 caps">
                  Q{index + 1} · {RETRO_THREE_QUESTION_COPY[key]}
                </label>
                <textarea
                  id={key}
                  ref={(node) => {
                    textareaRefs.current[key] = node;
                  }}
                  className="textarea"
                  rows={4}
                  value={threeQuestions[key]}
                  onChange={(event) => {
                    clearMessages();
                    setThreeQuestions((current) => ({ ...current, [key]: event.target.value }));
                  }}
                  onInput={(event) => resizeTextarea(event.currentTarget, MAX_TEXTAREA_HEIGHT)}
                  style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: "auto" }}
                />
                {questionErrors[key] ? <p className="daily-log-error">{questionErrors[key]}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {step === 4 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scopeChanges.map((scopeChange, index) => (
              <div
                key={scopeChange.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "10px 0",
                  borderTop: index === 0 ? "none" : "1px dashed var(--rule)",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14 }}>
                  <input
                    ref={(node) => {
                      scopeInputRefs.current[index] = {
                        change: node,
                        reason: scopeInputRefs.current[index]?.reason ?? null,
                      };
                    }}
                    className="input"
                    placeholder="砍了/加了什么"
                    value={scopeChange.change}
                    onChange={(event) => {
                      clearMessages();
                      setScopeChanges((current) =>
                        current.map((entry) =>
                          entry.id === scopeChange.id ? { ...entry, change: event.target.value } : entry,
                        ),
                      );
                    }}
                  />
                  <input
                    ref={(node) => {
                      scopeInputRefs.current[index] = {
                        change: scopeInputRefs.current[index]?.change ?? null,
                        reason: node,
                      };
                    }}
                    className="input"
                    placeholder="为什么"
                    value={scopeChange.reason}
                    onChange={(event) => {
                      clearMessages();
                      setScopeChanges((current) =>
                        current.map((entry) =>
                          entry.id === scopeChange.id ? { ...entry, reason: event.target.value } : entry,
                        ),
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      clearMessages();
                      setScopeChanges((current) => current.filter((entry) => entry.id !== scopeChange.id));
                    }}
                  >
                    ×
                  </button>
                </div>
                {scopeErrors[index]?.change ? <p className="daily-log-error">{scopeErrors[index]?.change}</p> : null}
                {scopeErrors[index]?.reason ? <p className="daily-log-error">{scopeErrors[index]?.reason}</p> : null}
              </div>
            ))}

            <div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  clearMessages();
                  const nextId = nextScopeId.current;
                  nextScopeId.current += 1;
                  setScopeChanges((current) => [...current, { id: nextId, change: "", reason: "" }]);
                }}
              >
                + 再加一条
              </button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="next-phase-first-thing" className="mono t-xs ink-3 caps">
              第 {segment.order + 1} 阶段 · 第 1 天第一件事
            </label>
            <input
              id="next-phase-first-thing"
              ref={hookInputRef}
              className="input"
              placeholder="具体到动作。『继续学习』不算。"
              value={nextPhaseFirstThing}
              onChange={(event) => {
                clearMessages();
                setNextPhaseFirstThing(event.target.value);
              }}
            />
            <p className="mono t-xs ink-4" style={{ margin: 0 }}>
              这条会被钉在下一阶段第 1 天的今日页 · 你不能假装没看见
            </p>
            {hookError ? <p className="daily-log-error">{hookError}</p> : null}
          </div>
        ) : null}
      </div>

      {submitError ? (
        <p className="daily-log-error" style={{ marginTop: 14 }}>
          {submitError}
        </p>
      ) : null}

      <div className="wizard-footer">
        <p className="wizard-footer-note mono t-xs ink-4">检查项的勾选不入库 · 只有你写的字会被记下来</p>
        <div className="wizard-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
          >
            ← 上一步
          </button>
          {step < RETRO_WIZARD_STEPS.length ? (
            <button
              type="button"
              className="btn btn--amber"
              onClick={() => setStep((current) => Math.min(RETRO_WIZARD_STEPS.length, current + 1))}
            >
              下一步 →
            </button>
          ) : (
            <button type="button" className="btn btn--amber" onClick={handleSubmit} disabled={isPending}>
              <span>{isPending ? "提交中…" : "提交复盘"}</span>
              <span className="kbd">⌘↵</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function focusFirstError(
    errorStep: number,
    nextScoreErrors: ScoreErrors,
    nextQuestionErrors: QuestionErrors,
    nextScopeErrors: ScopeErrors,
  ) {
    window.setTimeout(() => {
      if (errorStep === 2) {
        const key = RETRO_SCORE_KEYS.find((scoreKey) => nextScoreErrors[scoreKey]);
        const target = key ? scoreButtonRefs.current[key] : null;
        focusElement(target);
        return;
      }

      if (errorStep === 3) {
        const key = RETRO_THREE_QUESTION_ORDER.find((questionKey) => nextQuestionErrors[questionKey]);
        const target = key ? textareaRefs.current[key] : null;
        focusElement(target);
        return;
      }

      if (errorStep === 4) {
        const index = nextScopeErrors.findIndex((error) => error?.change || error?.reason);
        const target =
          index >= 0
            ? nextScopeErrors[index]?.change
              ? scopeInputRefs.current[index]?.change
              : scopeInputRefs.current[index]?.reason
            : null;
        focusElement(target);
        return;
      }

      if (errorStep === 5) {
        focusElement(hookInputRef.current);
      }
    }, 0);
  }
}

function createEmptyScores(): ScoreState {
  return {
    clarity: null,
    honesty: null,
    output: null,
    depth: null,
    discipline: null,
    energy: null,
  };
}

function createEmptyQuestions(): QuestionState {
  return {
    q1: "",
    q2: "",
    q3: "",
  };
}

function hasDraftText(
  threeQuestions: QuestionState,
  scopeChanges: ScopeDraft[],
  nextPhaseFirstThing: string,
): boolean {
  return (
    RETRO_THREE_QUESTION_ORDER.some((key) => threeQuestions[key].trim().length > 0) ||
    scopeChanges.some((scopeChange) => scopeChange.change.trim().length > 0 || scopeChange.reason.trim().length > 0) ||
    nextPhaseFirstThing.trim().length > 0
  );
}

function validateRetroDraft(
  scores: ScoreState,
  threeQuestions: QuestionState,
  scopeChanges: ScopeDraft[],
  nextPhaseFirstThing: string,
):
  | {
      isValid: true;
      selfScores: RetroSelfScoresInput;
      threeQuestions: RetroThreeQuestionsInput;
      scopeChanges: RetroScopeChangeInput[];
      nextPhaseFirstThing: string;
    }
  | {
      isValid: false;
      errorStep: number;
      scoreErrors: ScoreErrors;
      questionErrors: QuestionErrors;
      scopeErrors: ScopeErrors;
      hookError: string | null;
    } {
  const questionErrors: QuestionErrors = {};
  const scoreErrors: ScoreErrors = {};
  const scopeErrors: ScopeErrors = [];
  const trimmedQuestions = createEmptyQuestions();

  for (const key of RETRO_THREE_QUESTION_ORDER) {
    const trimmed = threeQuestions[key].trim();
    trimmedQuestions[key] = trimmed;

    if (!trimmed) {
      questionErrors[key] = REFLECTION_REQUIRED_ERROR;
      continue;
    }

    if (trimmed.length > 2000) {
      questionErrors[key] = REFLECTION_MAX_LENGTH_ERROR;
    }
  }

  for (const key of RETRO_SCORE_KEYS) {
    if (scores[key] === null) {
      scoreErrors[key] = SCORE_REQUIRED_ERROR;
    }
  }

  const cleanedScopeChanges: RetroScopeChangeInput[] = [];

  scopeChanges.forEach((scopeChange, index) => {
    const trimmedChange = scopeChange.change.trim();
    const trimmedReason = scopeChange.reason.trim();

    if (!trimmedChange && !trimmedReason) {
      return;
    }

    const rowErrors: Partial<Record<keyof RetroScopeChangeInput, string>> = {};

    if (!trimmedChange) {
      rowErrors.change = SCOPE_FIELD_REQUIRED_ERROR;
    } else if (trimmedChange.length > 500) {
      rowErrors.change = SCOPE_FIELD_MAX_LENGTH_ERROR;
    }

    if (!trimmedReason) {
      rowErrors.reason = SCOPE_FIELD_REQUIRED_ERROR;
    } else if (trimmedReason.length > 500) {
      rowErrors.reason = SCOPE_FIELD_MAX_LENGTH_ERROR;
    }

    if (rowErrors.change || rowErrors.reason) {
      scopeErrors[index] = rowErrors;
      return;
    }

    cleanedScopeChanges.push({
      change: trimmedChange,
      reason: trimmedReason,
    });
  });

  const trimmedHook = nextPhaseFirstThing.trim();
  let hookError: string | null = null;

  if (!trimmedHook) {
    hookError = HOOK_REQUIRED_ERROR;
  } else if (trimmedHook.length > 500) {
    hookError = HOOK_MAX_LENGTH_ERROR;
  }

  const errorStep = getClientErrorStep(scoreErrors, questionErrors, scopeErrors, hookError);

  if (errorStep !== null) {
    return {
      isValid: false,
      errorStep,
      scoreErrors,
      questionErrors,
      scopeErrors,
      hookError,
    };
  }

  return {
    isValid: true,
    selfScores: scores as RetroSelfScoresInput,
    threeQuestions: trimmedQuestions,
    scopeChanges: cleanedScopeChanges,
    nextPhaseFirstThing: trimmedHook,
  };
}

function getClientErrorStep(
  scoreErrors: ScoreErrors,
  questionErrors: QuestionErrors,
  scopeErrors: ScopeErrors,
  hookError: string | null,
): number | null {
  if (RETRO_SCORE_KEYS.some((key) => scoreErrors[key])) {
    return 2;
  }

  if (RETRO_THREE_QUESTION_ORDER.some((key) => questionErrors[key])) {
    return 3;
  }

  if (scopeErrors.some((error) => error?.change || error?.reason)) {
    return 4;
  }

  if (hookError) {
    return 5;
  }

  return null;
}

function mapScoreErrors(result: Extract<RetroActionResult, { ok: false }>): ScoreErrors {
  return {
    clarity: result.fieldErrors.selfScores?.clarity?.[0],
    honesty: result.fieldErrors.selfScores?.honesty?.[0],
    output: result.fieldErrors.selfScores?.output?.[0],
    depth: result.fieldErrors.selfScores?.depth?.[0],
    discipline: result.fieldErrors.selfScores?.discipline?.[0],
    energy: result.fieldErrors.selfScores?.energy?.[0],
  };
}

function mapQuestionErrors(result: Extract<RetroActionResult, { ok: false }>): QuestionErrors {
  return {
    q1: result.fieldErrors.threeQuestions?.q1?.[0],
    q2: result.fieldErrors.threeQuestions?.q2?.[0],
    q3: result.fieldErrors.threeQuestions?.q3?.[0],
  };
}

function mapScopeErrors(
  result: Extract<RetroActionResult, { ok: false }>,
  length: number,
): ScopeErrors {
  return Array.from({ length }, (_, index) => {
    const row = result.fieldErrors.scopeChanges?.[index];

    if (!row) {
      return undefined;
    }

    return {
      change: row.change?.[0],
      reason: row.reason?.[0],
    };
  });
}

function getErrorStep(
  result: Extract<RetroActionResult, { ok: false }>,
  scoreErrors: ScoreErrors,
  questionErrors: QuestionErrors,
  scopeErrors: ScopeErrors,
  hookError: string | null,
): number {
  if (result.fieldErrors.metrics && Object.keys(result.fieldErrors.metrics).length > 0) {
    return 1;
  }

  return getClientErrorStep(scoreErrors, questionErrors, scopeErrors, hookError) ?? 1;
}

function getSubmitError(result: Extract<RetroActionResult, { ok: false }>): string | null {
  return (
    result.fieldErrors.segmentId?.[0] ??
    Object.values(result.fieldErrors.metrics ?? {}).flat().find(Boolean) ??
    null
  );
}

function focusElement(element: HTMLElement | null | undefined) {
  element?.focus();
  element?.scrollIntoView({ block: "center", behavior: "smooth" });
}
