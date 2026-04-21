import { z } from "zod";

export const dailyLogCreate = z.object({
  projectId: z.string().min(1),
  date: z.coerce.date(),
  whatDone: z.array(z.string().min(1)),
  whatSkipped: z.array(z.string().min(1)),
  timeSpentMinutes: z.number().int().nonnegative(),
  tomorrowFirstThing: z.string().min(1),
  honestyNote: z.string().nullable().optional(),
});

export const dailyLogUpdate = dailyLogCreate.partial();

export type DailyLogCreateInput = z.infer<typeof dailyLogCreate>;
export type DailyLogUpdateInput = z.infer<typeof dailyLogUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("dailyLogCreate", () => {
    it("parses a well-formed daily log", () => {
      const parsed = dailyLogCreate.parse({
        projectId: "p1",
        date: "2026-04-21",
        whatDone: ["scaffold"],
        whatSkipped: [],
        timeSpentMinutes: 120,
        tomorrowFirstThing: "seed CLI",
      });
      expect(parsed.timeSpentMinutes).toBe(120);
    });

    it("rejects a negative time", () => {
      expect(() =>
        dailyLogCreate.parse({
          projectId: "p1",
          date: "2026-04-21",
          whatDone: [],
          whatSkipped: [],
          timeSpentMinutes: -5,
          tomorrowFirstThing: "x",
        }),
      ).toThrow();
    });
  });
}
