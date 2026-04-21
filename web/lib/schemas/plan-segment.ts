import { z } from "zod";

export const planSegmentCreate = z.object({
  projectId: z.string().min(1),
  order: z.number().int().nonnegative(),
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  goals: z.array(z.string().min(1)),
});

export const planSegmentUpdate = planSegmentCreate.partial();

export type PlanSegmentCreateInput = z.infer<typeof planSegmentCreate>;
export type PlanSegmentUpdateInput = z.infer<typeof planSegmentUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("planSegmentCreate", () => {
    it("parses a well-formed segment", () => {
      const parsed = planSegmentCreate.parse({
        projectId: "p1",
        order: 0,
        name: "Foundations",
        startDate: "2026-04-21",
        endDate: "2026-05-11",
        goals: ["ship scaffold", "land schema"],
      });
      expect(parsed.goals).toHaveLength(2);
    });

    it("rejects a negative order", () => {
      expect(() =>
        planSegmentCreate.parse({
          projectId: "p1",
          order: -1,
          name: "X",
          startDate: "2026-04-21",
          endDate: "2026-05-11",
          goals: [],
        }),
      ).toThrow();
    });
  });
}
