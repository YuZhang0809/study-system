import { z } from "zod";

const threeQuestions = z.object({
  kept: z.string(),
  changed: z.string(),
  killed: z.string(),
});

const scopeChange = z.object({
  from: z.string(),
  to: z.string(),
});

const selfScores = z.record(z.string(), z.number().int().min(1).max(5));

export const retroCreate = z.object({
  segmentId: z.string().min(1),
  metrics: z.record(z.string(), z.number()),
  selfScores,
  threeQuestions,
  scopeChanges: z.array(scopeChange),
});

export const retroUpdate = retroCreate.partial();

export type RetroCreateInput = z.infer<typeof retroCreate>;
export type RetroUpdateInput = z.infer<typeof retroUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("retroCreate", () => {
    it("parses a well-formed retro", () => {
      const parsed = retroCreate.parse({
        segmentId: "s1",
        metrics: { daysLogged: 10 },
        selfScores: { overall: 3 },
        threeQuestions: { kept: "x", changed: "y", killed: "z" },
        scopeChanges: [{ from: "A", to: "B" }],
      });
      expect(parsed.threeQuestions.kept).toBe("x");
      expect(parsed.scopeChanges).toHaveLength(1);
    });

    it("rejects a malformed threeQuestions", () => {
      expect(() =>
        retroCreate.parse({
          segmentId: "s1",
          metrics: {},
          selfScores: {},
          threeQuestions: { kept: "x" },
          scopeChanges: [],
        }),
      ).toThrow();
    });
  });
}
