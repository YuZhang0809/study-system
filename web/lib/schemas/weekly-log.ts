import { z } from "zod";

const reflectionAnswer = z.string().trim().min(1).max(2000);

export const weeklyLogReflections = z.object({
  q1: reflectionAnswer,
  q2: reflectionAnswer,
  q3: reflectionAnswer,
  q4: reflectionAnswer,
  q5: reflectionAnswer,
  q6: reflectionAnswer,
});

export const weeklyLogSelfScores = z.record(z.string(), z.number().int().min(1).max(5));

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
