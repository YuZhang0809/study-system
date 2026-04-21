import { z } from "zod";

export const artifactCreate = z.object({
  ownerType: z.string().min(1),
  ownerId: z.string().min(1),
  kind: z.string().min(1),
  urlOrPath: z.string().min(1),
  title: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const artifactUpdate = artifactCreate.partial();

export type ArtifactCreateInput = z.infer<typeof artifactCreate>;
export type ArtifactUpdateInput = z.infer<typeof artifactUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("artifactCreate", () => {
    it("parses a well-formed artifact pointer", () => {
      const parsed = artifactCreate.parse({
        ownerType: "knowledge_item",
        ownerId: "k1",
        kind: "link",
        urlOrPath: "https://example.test/x",
        title: "X",
        note: null,
      });
      expect(parsed.ownerType).toBe("knowledge_item");
      expect(parsed.title).toBe("X");
    });

    it("rejects an empty urlOrPath", () => {
      expect(() =>
        artifactCreate.parse({
          ownerType: "knowledge_item",
          ownerId: "k1",
          kind: "link",
          urlOrPath: "",
        }),
      ).toThrow();
    });
  });
}
