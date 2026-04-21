"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { Icon } from "@/components/shell/Icon";
import { upsertDailyLog, type DailyLogActionResult } from "@/lib/daily-log/actions";
import type { DailyLogRecord } from "@/lib/daily-log/queries";
import { formatIsoDate } from "@/lib/today/driving-seat";
import { Step1Checklist } from "./wizard/Step1Checklist";
import { Step2SkippedList } from "./wizard/Step2SkippedList";
import { Step3TimeInput } from "./wizard/Step3TimeInput";
import { Step4TomorrowNote } from "./wizard/Step4TomorrowNote";

interface EndOfDayWizardProps {
  projectId: string;
  today: Date;
  dayIndex: number;
  existingLog: DailyLogRecord | null;
  todayPlannedTasks: string[];
  yesterdayPromiseText: string | null;
  onClose: () => void;
}

interface Step1Entry {
  id: string;
  text: string;
  checked: boolean;
  origin: "plan" | "adhoc";
}

interface Step2Entry {
  id: string;
  text: string;
}

type FieldErrors = NonNullable<DailyLogActionResult["fieldErrors"]>;

const STEPS = [
  {
    number: 1,
    shortTitle: "做了什么",
    title: "做了什么 · 逐条",
    subtitle: "一条一个动作。『学了东西』不算。",
  },
  {
    number: 2,
    shortTitle: "偏离",
    title: "偏离 · 跳过/推迟",
    subtitle: "承认。说原因,不找借口。",
  },
  {
    number: 3,
    shortTitle: "时间",
    title: "时间 · 诚实估计",
    subtitle: "估到 15 分钟。高估低估都没意义。",
  },
  {
    number: 4,
    shortTitle: "明天第一件事",
    title: "明天第一件事 + 诚实便签",
    subtitle: "明早 9 点要做的那件事。",
  },
] as const;

let wizardRowCounter = 0;

function createWizardId(prefix: string): string {
  wizardRowCounter += 1;
  return `${prefix}-${wizardRowCounter}`;
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function incrementCount(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function consumeCount(counts: Map<string, number>, key: string): boolean {
  const current = counts.get(key) ?? 0;

  if (current <= 0) {
    return false;
  }

  if (current === 1) {
    counts.delete(key);
    return true;
  }

  counts.set(key, current - 1);
  return true;
}

function createStep1Entry(text: string, checked: boolean, origin: Step1Entry["origin"]): Step1Entry {
  return {
    id: createWizardId(origin),
    text,
    checked,
    origin,
  };
}

function createStep2Entry(text: string): Step2Entry {
  return {
    id: createWizardId("skipped"),
    text,
  };
}

function buildInitialStep1Entries(todayPlannedTasks: string[], existingLog: DailyLogRecord | null): Step1Entry[] {
  const plannedTexts = todayPlannedTasks.map(normalizeText).filter(Boolean);

  if (!existingLog) {
    return plannedTexts.map((text) => createStep1Entry(text, false, "plan"));
  }

  const doneTexts = existingLog.whatDone.map(normalizeText).filter(Boolean);
  const remainingDoneCounts = new Map<string, number>();

  for (const text of doneTexts) {
    incrementCount(remainingDoneCounts, text);
  }

  const step1Entries = plannedTexts.map((text) => {
    const checked = consumeCount(remainingDoneCounts, text);
    return createStep1Entry(text, checked, "plan");
  });

  for (const text of doneTexts) {
    if (consumeCount(remainingDoneCounts, text)) {
      step1Entries.push(createStep1Entry(text, true, "adhoc"));
    }
  }

  return step1Entries;
}

function buildInitialStep2Entries(
  step1Entries: Step1Entry[],
  existingLog: DailyLogRecord | null,
  yesterdayPromiseText: string | null,
): Step2Entry[] {
  if (!existingLog) {
    const initialText = normalizeText(yesterdayPromiseText);
    return initialText ? [createStep2Entry(initialText)] : [];
  }

  const representedPlannedSkips = new Map<string, number>();

  // Edit-mode reconstruction is intentionally lossy: planned rows stay in step 1,
  // while only skipped items not already represented by an unchecked plan row reopen in step 2.
  for (const entry of step1Entries) {
    if (entry.origin === "plan" && !entry.checked) {
      incrementCount(representedPlannedSkips, entry.text);
    }
  }

  const step2Entries: Step2Entry[] = [];

  for (const rawText of existingLog.whatSkipped) {
    const text = normalizeText(rawText);

    if (!text) {
      continue;
    }

    if (consumeCount(representedPlannedSkips, text)) {
      continue;
    }

    step2Entries.push(createStep2Entry(text));
  }

  return step2Entries;
}

function commitDraftEntry(entries: Step1Entry[], draftValue: string): { entries: Step1Entry[]; draftValue: string } {
  const text = normalizeText(draftValue);

  if (!text) {
    return {
      entries,
      draftValue: "",
    };
  }

  return {
    entries: [...entries, createStep1Entry(text, true, "adhoc")],
    draftValue: "",
  };
}

function getWhatDone(entries: Step1Entry[]): string[] {
  return entries.flatMap((entry) => {
    const text = normalizeText(entry.text);
    return entry.checked && text ? [text] : [];
  });
}

function getWhatSkipped(step1Entries: Step1Entry[], step2Entries: Step2Entry[]): string[] {
  return [
    ...step1Entries.flatMap((entry) => {
      const text = normalizeText(entry.text);
      return !entry.checked && text ? [text] : [];
    }),
    ...step2Entries.flatMap((entry) => {
      const text = normalizeText(entry.text);
      return text ? [text] : [];
    }),
  ];
}

function hasMeaningfulStep2Entries(entries: Step2Entry[]): boolean {
  return entries.some((entry) => normalizeText(entry.text).length > 0);
}

function getErrorStep(fieldErrors: FieldErrors, step2Entries: Step2Entry[]): number {
  const orderedFields = [
    "projectId",
    "date",
    "whatDone",
    "whatSkipped",
    "timeSpentMinutes",
    "tomorrowFirstThing",
    "honestyNote",
  ] as const;

  for (const field of orderedFields) {
    if (!fieldErrors[field]?.length) {
      continue;
    }

    switch (field) {
      case "timeSpentMinutes":
        return 3;
      case "tomorrowFirstThing":
      case "honestyNote":
        return 4;
      case "whatSkipped":
        return hasMeaningfulStep2Entries(step2Entries) ? 2 : 1;
      default:
        return 1;
    }
  }

  return 1;
}

export function EndOfDayWizard({
  projectId,
  today,
  dayIndex,
  existingLog,
  todayPlannedTasks,
  yesterdayPromiseText,
  onClose,
}: EndOfDayWizardProps) {
  const [initialState] = useState(() => {
    const step1 = buildInitialStep1Entries(todayPlannedTasks, existingLog);

    return {
      step1Entries: step1,
      step2Entries: buildInitialStep2Entries(step1, existingLog, yesterdayPromiseText),
    };
  });
  const [step, setStep] = useState(1);
  const [step1Entries, setStep1Entries] = useState(initialState.step1Entries);
  const [step1Draft, setStep1Draft] = useState("");
  const [step2Entries, setStep2Entries] = useState(initialState.step2Entries);
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(
    existingLog ? `${existingLog.timeSpentMinutes}` : "",
  );
  const [tomorrowFirstThing, setTomorrowFirstThing] = useState(existingLog?.tomorrowFirstThing ?? "");
  const [honestyNote, setHonestyNote] = useState(existingLog?.honestyNote ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
  }, [closeOnEscape]);

  function clearMessages() {
    if (submitError) {
      setSubmitError(null);
    }

    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors({});
    }
  }

  function commitStep1Draft() {
    const committed = commitDraftEntry(step1Entries, step1Draft);

    if (committed.entries !== step1Entries) {
      setStep1Entries(committed.entries);
    }

    if (committed.draftValue !== step1Draft) {
      setStep1Draft(committed.draftValue);
    }

    return committed.entries;
  }

  function handleStepChange(nextStep: number) {
    clearMessages();
    commitStep1Draft();
    setStep(nextStep);
  }

  function handleSubmit() {
    clearMessages();

    startTransition(() => {
      void submit();
    });
  }

  async function submit() {
    const committed = commitDraftEntry(step1Entries, step1Draft);
    const nextStep1Entries = committed.entries;

    if (committed.entries !== step1Entries) {
      setStep1Entries(committed.entries);
    }

    if (committed.draftValue !== step1Draft) {
      setStep1Draft(committed.draftValue);
    }

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("date", formatIsoDate(today));
    formData.set("timeSpentMinutes", timeSpentMinutes);
    formData.set("tomorrowFirstThing", tomorrowFirstThing);
    formData.set("honestyNote", honestyNote);

    for (const value of getWhatDone(nextStep1Entries)) {
      formData.append("whatDone", value);
    }

    for (const value of getWhatSkipped(nextStep1Entries, step2Entries)) {
      formData.append("whatSkipped", value);
    }

    try {
      const result = await upsertDailyLog(formData);

      if (!result.ok) {
        const nextFieldErrors = (result.fieldErrors ?? {}) as FieldErrors;
        setFieldErrors(nextFieldErrors);
        setStep(getErrorStep(nextFieldErrors, step2Entries));
        return;
      }

      onClose();
    } catch {
      setSubmitError("提交失败，请稍后再试。");
    }
  }

  const whatDoneError = fieldErrors.whatDone?.[0];
  const whatSkippedError = fieldErrors.whatSkipped?.[0];
  const timeError = fieldErrors.timeSpentMinutes?.[0];
  const tomorrowError = fieldErrors.tomorrowFirstThing?.[0];
  const honestyError = fieldErrors.honestyNote?.[0];
  const activeStep = STEPS[step - 1];

  return (
    <div className="wizard-scrim" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="wizard-modal" role="dialog" aria-modal="true" aria-labelledby="end-of-day-title">
        <div className="wizard-head">
          <div>
            <div className="wizard-kicker mono t-xs ink-3 caps">收工 · 向导</div>
            <h2 id="end-of-day-title" className="wizard-title serif">
              daily_log · d{dayIndex} · {formatIsoDate(today)}
            </h2>
          </div>
          <button type="button" className="btn btn--ghost wizard-close" onClick={onClose}>
            <Icon name="close" size={11} />
            <span className="kbd">Esc</span>
          </button>
        </div>

        <div className="wizard-steps" role="tablist" aria-label="收工步骤">
          {STEPS.map((item) => {
            const isActive = item.number === step;
            const isPast = item.number < step;

            return (
              <button
                key={item.number}
                type="button"
                className={`wizard-step${isActive ? " is-active" : ""}${isPast ? " is-past" : ""}`}
                onClick={() => handleStepChange(item.number)}
                role="tab"
                aria-selected={isActive}
              >
                <div className="wizard-step-index mono t-xs ink-3">
                  {item.number}/{STEPS.length}
                  {isPast ? <span className="wizard-step-check">✓</span> : null}
                </div>
                <div className="wizard-step-title serif">{item.shortTitle}</div>
              </button>
            );
          })}
        </div>

        <div className="wizard-body">
          <h3 className="wizard-section-title serif">{activeStep.title}</h3>
          <p className="wizard-section-subtitle serif">{activeStep.subtitle}</p>

          {step === 1 ? (
            <Step1Checklist
              entries={step1Entries}
              draftValue={step1Draft}
              onDraftChange={(value) => {
                clearMessages();
                setStep1Draft(value);
              }}
              onCommitDraft={() => {
                clearMessages();
                commitStep1Draft();
              }}
              onToggle={(id) => {
                clearMessages();
                setStep1Entries((current) =>
                  current.map((entry) =>
                    entry.id === id
                      ? {
                          ...entry,
                          checked: !entry.checked,
                        }
                      : entry,
                  ),
                );
              }}
              doneError={whatDoneError}
              skippedError={whatSkippedError}
            />
          ) : null}

          {step === 2 ? (
            <Step2SkippedList
              entries={step2Entries}
              onAddRow={() => {
                clearMessages();
                setStep2Entries((current) => [...current, createStep2Entry("")]);
              }}
              onChange={(id, value) => {
                clearMessages();
                setStep2Entries((current) =>
                  current.map((entry) => (entry.id === id ? { ...entry, text: value } : entry)),
                );
              }}
              onRemove={(id) => {
                clearMessages();
                setStep2Entries((current) => current.filter((entry) => entry.id !== id));
              }}
              error={whatSkippedError}
            />
          ) : null}

          {step === 3 ? (
            <Step3TimeInput
              value={timeSpentMinutes}
              onChange={(value) => {
                clearMessages();
                setTimeSpentMinutes(value);
              }}
              onSelectPreset={(value) => {
                clearMessages();
                setTimeSpentMinutes(value);
              }}
              error={timeError}
            />
          ) : null}

          {step === 4 ? (
            <Step4TomorrowNote
              tomorrowFirstThing={tomorrowFirstThing}
              honestyNote={honestyNote}
              onTomorrowChange={(value) => {
                clearMessages();
                setTomorrowFirstThing(value);
              }}
              onHonestyChange={(value) => {
                clearMessages();
                setHonestyNote(value);
              }}
              tomorrowError={tomorrowError}
              honestyError={honestyError}
              onSubmitShortcut={handleSubmit}
            />
          ) : null}
        </div>

        {submitError ? (
          <p className="daily-log-error" aria-live="polite">
            {submitError}
          </p>
        ) : null}

        <div className="wizard-footer">
          <p className="wizard-footer-note mono t-xs ink-4">
            不写自由文本『今天想说什么』 · 结构化字段,就事论事
          </p>
          <div className="wizard-actions">
            <button
              type="button"
              className="btn"
              onClick={() => handleStepChange(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              ← back
            </button>
            {step < STEPS.length ? (
              <button
                type="button"
                className="btn btn--amber"
                onClick={() => handleStepChange(Math.min(STEPS.length, step + 1))}
              >
                next →
              </button>
            ) : (
              <button type="button" className="btn btn--amber" onClick={handleSubmit} disabled={isPending}>
                <span>{isPending ? "提交中…" : "Commit log"}</span>
                <span className="kbd">⌘↵</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
