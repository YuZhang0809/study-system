import { z } from "zod";

export const planDayCreate = z.object({
  segmentId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1),
  date: z.coerce.date(),
  title: z.string().min(1),
  plannedTasks: z.array(z.string().min(1)),
});

export const planDayUpdate = planDayCreate.partial();

export type PlanDayCreateInput = z.infer<typeof planDayCreate>;
export type PlanDayUpdateInput = z.infer<typeof planDayUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("planDayCreate", () => {
    it("parses a well-formed day with no segment", () => {
      const parsed = planDayCreate.parse({
        segmentId: null,
        projectId: "p1",
        date: "2026-04-21",
        title: "Kickoff",
        plannedTasks: ["read PRD"],
      });
      expect(parsed.segmentId).toBeNull();
      expect(parsed.plannedTasks).toHaveLength(1);
    });

    it("rejects an empty title", () => {
      expect(() =>
        planDayCreate.parse({
          projectId: "p1",
          date: "2026-04-21",
          title: "",
          plannedTasks: [],
        }),
      ).toThrow();
    });
  });
}
