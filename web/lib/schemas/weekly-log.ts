import { z } from "zod";
import {
  WEEKLY_REFLECTION_MAX_LENGTH_ERROR,
  WEEKLY_REFLECTION_REQUIRED_ERROR,
  WEEKLY_SCORE_RANGE_ERROR,
} from "../weekly-log/copy";

const reflectionAnswer = z
  .string()
  .trim()
  .min(1, WEEKLY_REFLECTION_REQUIRED_ERROR)
  .max(2000, WEEKLY_REFLECTION_MAX_LENGTH_ERROR);

export const weeklyLogReflections = z.object({
  q1: reflectionAnswer,
  q2: reflectionAnswer,
  q3: reflectionAnswer,
  q4: reflectionAnswer,
  q5: reflectionAnswer,
  q6: reflectionAnswer,
});

export const weeklyLogSelfScores = z.record(
  z.string(),
  z.number().int(WEEKLY_SCORE_RANGE_ERROR).min(1, WEEKLY_SCORE_RANGE_ERROR).max(5, WEEKLY_SCORE_RANGE_ERROR),
);

export const weeklyLogCreate = z.object({
  projectId: z.string().min(1),
  weekStart: z.coerce.date(),
  reflections: weeklyLogReflections,
  selfScores: weeklyLogSelfScores,
});

export const weeklyLogUpdate = weeklyLogCreate.partial();

export type WeeklyLogCreateRawInput = z.input<typeof weeklyLogCreate>;
export type WeeklyLogCreateInput = z.infer<typeof weeklyLogCreate>;
export type WeeklyLogUpdateInput = z.infer<typeof weeklyLogUpdate>;
export type WeeklyLogReflectionsInput = z.infer<typeof weeklyLogReflections>;
export type WeeklyLogSelfScoresInput = z.infer<typeof weeklyLogSelfScores>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("weeklyLogCreate", () => {
    it("parses a well-formed weekly log", () => {
      const parsed = weeklyLogCreate.parse({
        projectId: "p1",
        weekStart: "2026-04-20",
        reflections: { q1: "a", q2: "b", q3: "c", q4: "d", q5: "e", q6: "f" },
        selfScores: { focus: 3, rigor: 4 },
      });
      expect(parsed.reflections.q6).toBe("f");
      expect(parsed.selfScores.focus).toBe(3);
    });

    it("rejects whitespace-only reflections after trimming", () => {
      expect(() =>
        weeklyLogCreate.parse({
          projectId: "p1",
          weekStart: "2026-04-20",
          reflections: { q1: "a", q2: "b", q3: "   ", q4: "d", q5: "e", q6: "f" },
          selfScores: { focus: 3, rigor: 4 },
        }),
      ).toThrow();
    });

    it("rejects a self-score outside 1..5", () => {
      expect(() =>
        weeklyLogCreate.parse({
          projectId: "p1",
          weekStart: "2026-04-20",
          reflections: { q1: "a", q2: "b", q3: "c", q4: "d", q5: "e", q6: "f" },
          selfScores: { focus: 9 },
        }),
      ).toThrow();
    });
  });
}
