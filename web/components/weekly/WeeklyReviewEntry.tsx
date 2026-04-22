"use client";

import { useState } from "react";
import type { WeeklyLogReflectionsInput, WeeklyLogSelfScoresInput } from "@/lib/schemas/weekly-log";
import { WeeklyReviewModal } from "./WeeklyReviewModal";

export interface WeeklyReviewEntryProps {
  projectId: string;
  thisWeekStart: Date;
  thisWeekEnd: Date;
  existingLog: {
    reflections: WeeklyLogReflectionsInput;
    selfScores: WeeklyLogSelfScoresInput;
  } | null;
  previousWeekQ6: string | null;
  phaseHref?: string;
  phaseCount?: number;
}

export function WeeklyReviewEntry({
  projectId,
  thisWeekStart,
  thisWeekEnd,
  existingLog,
  previousWeekQ6,
  phaseHref,
  phaseCount = 0,
}: WeeklyReviewEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const primaryLabel = existingLog ? "修改本周" : "本周复盘";

  return (
    <>
      <div className="page-head-actions">
        {phaseHref ? (
          <a className="btn" href={phaseHref}>
            <span>阶段复盘 · {phaseCount}</span>
          </a>
        ) : (
          <button type="button" className="btn" disabled title="下一切换">
            <span>阶段复盘 · 向导</span>
          </button>
        )}
        <button type="button" className="btn btn--amber" onClick={() => setIsOpen(true)}>
          <span>{primaryLabel}</span>
          <span className="kbd">⌘↵</span>
        </button>
      </div>

      {isOpen ? (
        <WeeklyReviewModal
          projectId={projectId}
          weekStart={thisWeekStart}
          weekEnd={thisWeekEnd}
          existingLog={existingLog}
          previousWeekQ6={previousWeekQ6}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
