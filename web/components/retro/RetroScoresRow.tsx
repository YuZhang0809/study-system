"use client";

import { WeeklyScoresRow, type WeeklyScoresRowProps } from "@/components/weekly/WeeklyScoresRow";

export type RetroScoresRowProps = WeeklyScoresRowProps;

export function RetroScoresRow(props: RetroScoresRowProps) {
  return <WeeklyScoresRow {...props} />;
}
