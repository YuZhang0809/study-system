import { z } from "zod";
import { projectHasPlanStructure, projectStatus } from "./enums";

export const projectCreate = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  hasPlanStructure: projectHasPlanStructure,
  status: projectStatus,
});

export const projectUpdate = projectCreate.partial();

export type ProjectCreateInput = z.infer<typeof projectCreate>;
export type ProjectUpdateInput = z.infer<typeof projectUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("projectCreate", () => {
    it("parses a well-formed project", () => {
      const parsed = projectCreate.parse({
        name: "90-day Agentic",
        startDate: "2026-04-21",
        endDate: null,
        hasPlanStructure: "full",
        status: "active",
      });
      expect(parsed.name).toBe("90-day Agentic");
      expect(parsed.startDate).toBeInstanceOf(Date);
    });

    it("rejects an unknown status", () => {
      expect(() =>
        projectCreate.parse({
          name: "X",
          startDate: "2026-04-21",
          hasPlanStructure: "open",
          status: "archived",
        }),
      ).toThrow();
    });
  });
}
