"use client";

import { useEffect, useState, useTransition } from "react";
import { upsertDailyLog, type DailyLogActionResult } from "@/lib/daily-log/actions";
import { formatHourMinute } from "@/lib/daily-log/presentation";
import type { DailyLogRecord } from "@/lib/daily-log/queries";
import { formatIsoDate } from "@/lib/today/driving-seat";
import { ChipEditor } from "./ChipEditor";
import { DailyLogSummary } from "./DailyLogSummary";

interface DailyLogComposeProps {
  projectId: string;
  today: Date;
  initialValues: DailyLogRecord | null;
}

interface FormState {
  whatDone: string[];
  whatSkipped: string[];
  timeSpentMinutes: string;
  tomorrowFirstThing: string;
  honestyNote: string;
}

export function DailyLogCompose({ projectId, today, initialValues }: DailyLogComposeProps) {
  const [savedLog, setSavedLog] = useState<DailyLogRecord | null>(initialValues);
  const [isExpanded, setIsExpanded] = useState(initialValues === null);
  const [formState, setFormState] = useState<FormState>(() => toFormState(initialValues));
  const [fieldErrors, setFieldErrors] = useState<DailyLogActionResult["fieldErrors"]>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSavedLog(initialValues);
    setFormState(toFormState(initialValues));
    setIsExpanded(initialValues === null);
    setFieldErrors({});
    setSubmitError(null);
  }, [initialValues]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      void submit(formData);
    });
  }

  async function submit(formData: FormData) {
    try {
      const result = await upsertDailyLog(formData);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      const nextLog = buildSavedLog(projectId, today, formState, savedLog);
      setSavedLog(nextLog);
      setIsExpanded(false);
      setFieldErrors({});
    } catch {
      setSubmitError("提交失败，请稍后再试。");
    }
  }

  return (
    <section className="card daily-log-card">
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="date" value={formatIsoDate(today)} />

        <div className="daily-log-head">
          <div className="daily-log-title-row">
            <span className="daily-log-title">今日日志 · {formatIsoDate(today)}</span>
          </div>
          <span className={`daily-log-status${savedLog ? "" : " is-empty"}`}>
            {savedLog ? `今日已写 · ${formatHourMinute(savedLog.updatedAt)} 提交时间` : "今日还未写"}
          </span>
        </div>

        {!isExpanded && savedLog ? (
          <DailyLogSummary
            log={savedLog}
            onExpand={() => {
              setIsExpanded(true);
              setFieldErrors({});
              setSubmitError(null);
            }}
          />
        ) : (
          <div className="daily-log-form">
            <ChipEditor
              label="今天做了什么"
              name="whatDone"
              values={formState.whatDone}
              onChange={(values) => setFormState((current) => ({ ...current, whatDone: values }))}
              placeholder="+ 一项 ↵"
              maxItems={20}
              maxLength={200}
              autoFocus
              errors={fieldErrors?.whatDone}
            />

            <ChipEditor
              label="今天没做什么"
              name="whatSkipped"
              values={formState.whatSkipped}
              onChange={(values) => setFormState((current) => ({ ...current, whatSkipped: values }))}
              placeholder="+ 一项 ↵"
              maxItems={20}
              maxLength={200}
              errors={fieldErrors?.whatSkipped}
            />

            <label className="daily-log-field">
              <span className="mono t-xs ink-3 caps">用时</span>
              <div className="daily-time-row">
                <input
                  name="timeSpentMinutes"
                  type="number"
                  className="input daily-time-input"
                  min={0}
                  step={15}
                  placeholder="120"
                  value={formState.timeSpentMinutes}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, timeSpentMinutes: event.target.value }))
                  }
                />
                <span className="mono t-xs ink-3">分钟</span>
              </div>
              <FieldError errors={fieldErrors} name="timeSpentMinutes" />
            </label>

            <label className="daily-log-field">
              <span className="mono t-xs ink-3 caps">明天第一件事</span>
              <input
                name="tomorrowFirstThing"
                className="input"
                value={formState.tomorrowFirstThing}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, tomorrowFirstThing: event.target.value }))
                }
                placeholder="一句话 · 明天开工就干这个"
                maxLength={240}
              />
              <FieldError errors={fieldErrors} name="tomorrowFirstThing" />
            </label>

            <label className="daily-log-field">
              <span className="mono t-xs ink-3 caps">诚实笔记</span>
              <textarea
                name="honestyNote"
                className="textarea"
                rows={3}
                value={formState.honestyNote}
                onChange={(event) => setFormState((current) => ({ ...current, honestyNote: event.target.value }))}
                onKeyDown={handleTextareaKeyDown}
                placeholder="{无则留空} · 今日有什么没讲出来的?"
                maxLength={2000}
              />
              <FieldError errors={fieldErrors} name="honestyNote" />
            </label>

            {submitError ? (
              <p className="daily-log-error" aria-live="polite">
                {submitError}
              </p>
            ) : null}

            <div className="daily-log-footer">
              <p className="daily-log-note">AI 不参与</p>
              <button type="submit" className="btn btn--primary" disabled={isPending}>
                <span>{isPending ? "提交中…" : "提交"}</span>
                <span className="kbd">⌘↵</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}

function toFormState(log: DailyLogRecord | null): FormState {
  return {
    whatDone: log?.whatDone ?? [],
    whatSkipped: log?.whatSkipped ?? [],
    timeSpentMinutes: log ? `${log.timeSpentMinutes}` : "",
    tomorrowFirstThing: log?.tomorrowFirstThing ?? "",
    honestyNote: log?.honestyNote ?? "",
  };
}

function buildSavedLog(
  projectId: string,
  today: Date,
  formState: FormState,
  current: DailyLogRecord | null,
): DailyLogRecord {
  return {
    id: current?.id ?? "today-log",
    projectId,
    date: today,
    whatDone: formState.whatDone,
    whatSkipped: formState.whatSkipped,
    timeSpentMinutes: Number(formState.timeSpentMinutes),
    tomorrowFirstThing: formState.tomorrowFirstThing.trim(),
    honestyNote: formState.honestyNote.trim() || null,
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
}

function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key === "NumpadEnter")) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

function FieldError({
  errors,
  name,
}: {
  errors: DailyLogActionResult["fieldErrors"];
  name: string;
}) {
  const message = errors?.[name]?.[0];

  if (!message) {
    return null;
  }

  return <p className="daily-log-error">{message}</p>;
}
