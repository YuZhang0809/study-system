import type { DailyLogRecord } from "./queries";

export interface Step1Entry {
  id: string;
  text: string;
  checked: boolean;
  origin: "plan" | "adhoc";
  persistsWhenUnchecked: boolean;
  representsStoredSkip: boolean;
}

export interface Step2Entry {
  id: string;
  text: string;
}

let wizardRowCounter = 0;

function createWizardId(prefix: string): string {
  wizardRowCounter += 1;
  return `${prefix}-${wizardRowCounter}`;
}

export function normalizeText(value: string | null | undefined): string {
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

export function createStep1Entry(
  text: string,
  checked: boolean,
  origin: Step1Entry["origin"],
  persistsWhenUnchecked: boolean,
  representsStoredSkip = false,
): Step1Entry {
  return {
    id: createWizardId(origin),
    text,
    checked,
    origin,
    persistsWhenUnchecked,
    representsStoredSkip,
  };
}

export function createStep2Entry(text: string): Step2Entry {
  return {
    id: createWizardId("skipped"),
    text,
  };
}

export function buildInitialStep1Entries(todayPlannedTasks: string[], existingLog: DailyLogRecord | null): Step1Entry[] {
  const plannedTexts = todayPlannedTasks.map(normalizeText).filter(Boolean);

  if (!existingLog) {
    return plannedTexts.map((text) => createStep1Entry(text, false, "plan", true));
  }

  const doneTexts = existingLog.whatDone.map(normalizeText).filter(Boolean);
  const skippedTexts = existingLog.whatSkipped.map(normalizeText).filter(Boolean);
  const remainingDoneCounts = new Map<string, number>();
  const remainingSkippedCounts = new Map<string, number>();

  for (const text of doneTexts) {
    incrementCount(remainingDoneCounts, text);
  }

  for (const text of skippedTexts) {
    incrementCount(remainingSkippedCounts, text);
  }

  const step1Entries = plannedTexts.map((text) => {
    const checked = consumeCount(remainingDoneCounts, text);
    const representsStoredSkip = checked ? false : consumeCount(remainingSkippedCounts, text);

    return createStep1Entry(text, checked, "plan", representsStoredSkip, representsStoredSkip);
  });

  for (const text of doneTexts) {
    if (consumeCount(remainingDoneCounts, text)) {
      step1Entries.push(createStep1Entry(text, true, "adhoc", false));
    }
  }

  return step1Entries;
}

export function buildInitialStep2Entries(
  step1Entries: Step1Entry[],
  existingLog: DailyLogRecord | null,
  yesterdayPromiseText: string | null,
): Step2Entry[] {
  const step2Entries: Step2Entry[] = [];

  if (existingLog) {
    const representedSkippedCounts = new Map<string, number>();

    for (const entry of step1Entries) {
      if (!entry.checked && entry.representsStoredSkip) {
        incrementCount(representedSkippedCounts, normalizeText(entry.text));
      }
    }

    for (const rawText of existingLog.whatSkipped) {
      const text = normalizeText(rawText);

      if (!text) {
        continue;
      }

      if (consumeCount(representedSkippedCounts, text)) {
        continue;
      }

      step2Entries.push(createStep2Entry(text));
    }
  }

  const promiseText = normalizeText(yesterdayPromiseText);

  if (!promiseText) {
    return step2Entries;
  }

  const hasPromiseInStep1 = step1Entries.some(
    (entry) => !entry.checked && entry.representsStoredSkip && normalizeText(entry.text) === promiseText,
  );
  const hasPromiseInStep2 = step2Entries.some((entry) => normalizeText(entry.text) === promiseText);

  if (hasPromiseInStep1 || hasPromiseInStep2) {
    return step2Entries;
  }

  return [createStep2Entry(promiseText), ...step2Entries];
}

export function toggleStep1Entry(entry: Step1Entry): Step1Entry {
  if (entry.checked) {
    return {
      ...entry,
      checked: false,
      persistsWhenUnchecked: true,
    };
  }

  return {
    ...entry,
    checked: true,
  };
}

export function getWhatDone(entries: Step1Entry[]): string[] {
  return entries.flatMap((entry) => {
    const text = normalizeText(entry.text);
    return entry.checked && text ? [text] : [];
  });
}

export function getWhatSkipped(step1Entries: Step1Entry[], step2Entries: Step2Entry[]): string[] {
  return [
    ...step1Entries.flatMap((entry) => {
      const text = normalizeText(entry.text);
      return !entry.checked && entry.persistsWhenUnchecked && text ? [text] : [];
    }),
    ...step2Entries.flatMap((entry) => {
      const text = normalizeText(entry.text);
      return text ? [text] : [];
    }),
  ];
}
