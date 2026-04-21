import { z } from "zod";

export const blockerCreate = z.object({
  projectId: z.string().min(1),
  text: z.string().min(1),
  openedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable().optional(),
});

export const blockerUpdate = blockerCreate.partial();

export type BlockerCreateInput = z.infer<typeof blockerCreate>;
export type BlockerUpdateInput = z.infer<typeof blockerUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("blockerCreate", () => {
    it("parses a well-formed blocker", () => {
      const parsed = blockerCreate.parse({
        projectId: "p1",
        text: "awaiting design decision",
        openedAt: "2026-04-21",
        resolvedAt: null,
      });
      expect(parsed.resolvedAt).toBeNull();
    });

    it("rejects empty text", () => {
      expect(() =>
        blockerCreate.parse({
          projectId: "p1",
          text: "",
          openedAt: "2026-04-21",
        }),
      ).toThrow();
    });
  });
}
