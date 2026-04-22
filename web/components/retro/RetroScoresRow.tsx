"use client";

import { WeeklyScoresRow, type WeeklyScoresRowProps } from "@/components/weekly/WeeklyScoresRow";

export interface RetroScoresRowProps extends WeeklyScoresRowProps {}

export function RetroScoresRow(props: RetroScoresRowProps) {
  return <WeeklyScoresRow {...props} />;
}
