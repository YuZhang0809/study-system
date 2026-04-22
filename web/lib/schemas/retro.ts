import { z } from "zod";
import {
  HOOK_MAX_LENGTH_ERROR,
  HOOK_REQUIRED_ERROR,
  REFLECTION_MAX_LENGTH_ERROR,
  REFLECTION_REQUIRED_ERROR,
  RETRO_METRIC_KEYS,
  RETRO_SCORE_KEYS,
  SCORE_RANGE_ERROR,
  SCOPE_FIELD_MAX_LENGTH_ERROR,
  SCOPE_FIELD_REQUIRED_ERROR,
} from "../retro/copy";

const retroReflectionAnswer = z
  .string()
  .trim()
  .min(1, REFLECTION_REQUIRED_ERROR)
  .max(2000, REFLECTION_MAX_LENGTH_ERROR);

export const retroThreeQuestions = z.object({
  q1: retroReflectionAnswer,
  q2: retroReflectionAnswer,
  q3: retroReflectionAnswer,
});

const retroScopeField = z
  .string()
  .trim()
  .min(1, SCOPE_FIELD_REQUIRED_ERROR)
  .max(500, SCOPE_FIELD_MAX_LENGTH_ERROR);

export const retroScopeChange = z.object({
  change: retroScopeField,
  reason: retroScopeField,
});

export const retroScopeChanges = z.array(retroScopeChange);

const retroMetric = z.number().int().min(0);

export const retroMetrics = z.object(
  Object.fromEntries(RETRO_METRIC_KEYS.map((key) => [key, retroMetric])) as Record<
    (typeof RETRO_METRIC_KEYS)[number],
    typeof retroMetric
  >,
);

const retroScore = z
  .number()
  .int(SCORE_RANGE_ERROR)
  .min(1, SCORE_RANGE_ERROR)
  .max(5, SCORE_RANGE_ERROR);

export const retroSelfScores = z.object(
  Object.fromEntries(RETRO_SCORE_KEYS.map((key) => [key, retroScore])) as Record<
    (typeof RETRO_SCORE_KEYS)[number],
    typeof retroScore
  >,
);

export const retroNextPhaseFirstThing = z
  .string()
  .trim()
  .min(1, HOOK_REQUIRED_ERROR)
  .max(500, HOOK_MAX_LENGTH_ERROR);

export const retroCreate = z.object({
  segmentId: z.string().min(1),
  metrics: retroMetrics,
  selfScores: retroSelfScores,
  threeQuestions: retroThreeQuestions,
  scopeChanges: retroScopeChanges,
  nextPhaseFirstThing: retroNextPhaseFirstThing,
});

export type RetroCreateRawInput = z.input<typeof retroCreate>;
export type RetroCreateInput = z.infer<typeof retroCreate>;
export type RetroMetricsInput = z.infer<typeof retroMetrics>;
export type RetroSelfScoresInput = z.infer<typeof retroSelfScores>;
export type RetroThreeQuestionsInput = z.infer<typeof retroThreeQuestions>;
export type RetroScopeChangeInput = z.infer<typeof retroScopeChange>;
export type RetroScopeChangesInput = z.infer<typeof retroScopeChanges>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("retroCreate", () => {
    it("parses a well-formed retro", () => {
      const parsed = retroCreate.parse({
        segmentId: "segment-1",
        metrics: {
          commits: 3,
          logs: 7,
          learnings: 2,
          bugs: 1,
          prompts: 4,
          planned_days: 9,
          drift_days: 2,
        },
        selfScores: {
          clarity: 3,
          honesty: 4,
          output: 3,
          depth: 4,
          discipline: 3,
          energy: 2,
        },
        threeQuestions: {
          q1: "把证据拉出来了。",
          q2: "当时其实没懂异步边界。",
          q3: "可以先砍环境折腾。",
        },
        scopeChanges: [
          {
            change: "砍掉规范通读",
            reason: "ROI 太低",
          },
        ],
        nextPhaseFirstThing: "先跑 baseline",
      });

      expect(parsed.threeQuestions.q2).toBe("当时其实没懂异步边界。");
      expect(parsed.scopeChanges[0]?.change).toBe("砍掉规范通读");
    });

    it("rejects whitespace-only answers after trimming", () => {
      expect(() =>
        retroCreate.parse({
          segmentId: "segment-1",
          metrics: {
            commits: 0,
            logs: 0,
            learnings: 0,
            bugs: 0,
            prompts: 0,
            planned_days: 0,
            drift_days: 0,
          },
          selfScores: {
            clarity: 3,
            honesty: 4,
            output: 3,
            depth: 4,
            discipline: 3,
            energy: 2,
          },
          threeQuestions: {
            q1: "搞懂了日志结构。",
            q2: "   ",
            q3: "可以少做一轮试错。",
          },
          scopeChanges: [],
          nextPhaseFirstThing: "继续跑 baseline",
        }),
      ).toThrow();
    });

    it("rejects scores outside 1..5", () => {
      expect(() =>
        retroCreate.parse({
          segmentId: "segment-1",
          metrics: {
            commits: 0,
            logs: 0,
            learnings: 0,
            bugs: 0,
            prompts: 0,
            planned_days: 0,
            drift_days: 0,
          },
          selfScores: {
            clarity: 6,
            honesty: 4,
            output: 3,
            depth: 4,
            discipline: 3,
            energy: 2,
          },
          threeQuestions: {
            q1: "搞懂了日志结构。",
            q2: "没搞懂异步边界。",
            q3: "先砍多余探索。",
          },
          scopeChanges: [],
          nextPhaseFirstThing: "继续跑 baseline",
        }),
      ).toThrow();
    });
  });
}
