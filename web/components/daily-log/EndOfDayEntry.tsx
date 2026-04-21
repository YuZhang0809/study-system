"use client";

import { useState } from "react";
import type { DailyLogRecord } from "@/lib/daily-log/queries";
import { EndOfDayWizard } from "./EndOfDayWizard";

interface EndOfDayEntryProps {
  projectId: string;
  today: Date;
  dayIndex: number;
  existingLog: DailyLogRecord | null;
  todayPlannedTasks: string[];
  yesterdayPromiseText: string | null;
}

export function EndOfDayEntry({
  projectId,
  today,
  dayIndex,
  existingLog,
  todayPlannedTasks,
  yesterdayPromiseText,
}: EndOfDayEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const primaryLabel = existingLog ? "修改今日" : "今日收工";

  return (
    <>
      <div className="page-head-actions">
        <button
          type="button"
          className="btn"
          disabled
          title="N 快捷键待定 · 先从 /knowledge 新建"
        >
          <span>+ 记一条</span>
          <span className="kbd">N</span>
        </button>
        <button type="button" className="btn btn--amber" onClick={() => setIsOpen(true)}>
          <span>{primaryLabel}</span>
          <span className="kbd">⌘↵</span>
        </button>
      </div>

      {isOpen ? (
        <EndOfDayWizard
          projectId={projectId}
          today={today}
          dayIndex={dayIndex}
          existingLog={existingLog}
          todayPlannedTasks={todayPlannedTasks}
          yesterdayPromiseText={yesterdayPromiseText}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
