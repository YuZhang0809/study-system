import { z } from "zod";

const reflections = z.object({
  q1: z.string(),
  q2: z.string(),
  q3: z.string(),
  q4: z.string(),
  q5: z.string(),
  q6: z.string(),
});

const selfScores = z.record(z.string(), z.number().int().min(1).max(5));

export const weeklyLogCreate = z.object({
  projectId: z.string().min(1),
  weekStart: z.coerce.date(),
  reflections,
  selfScores,
});

export const weeklyLogUpdate = weeklyLogCreate.partial();

export type WeeklyLogCreateInput = z.infer<typeof weeklyLogCreate>;
export type WeeklyLogUpdateInput = z.infer<typeof weeklyLogUpdate>;

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
