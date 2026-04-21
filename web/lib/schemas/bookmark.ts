import { z } from "zod";

export const bookmarkCreate = z.object({
  projectId: z.string().min(1),
  label: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
});

export const bookmarkUpdate = bookmarkCreate.partial();

export type BookmarkCreateInput = z.infer<typeof bookmarkCreate>;
export type BookmarkUpdateInput = z.infer<typeof bookmarkUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("bookmarkCreate", () => {
    it("parses a well-formed bookmark", () => {
      const parsed = bookmarkCreate.parse({
        projectId: "p1",
        label: "Today's knowledge",
        targetType: "knowledge_item",
        targetId: "k1",
      });
      expect(parsed.label).toBe("Today's knowledge");
    });

    it("rejects an empty label", () => {
      expect(() =>
        bookmarkCreate.parse({
          projectId: "p1",
          label: "",
          targetType: "knowledge_item",
          targetId: "k1",
        }),
      ).toThrow();
    });
  });
}
