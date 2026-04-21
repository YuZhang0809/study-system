import { z } from "zod";
import { knowledgeItemType } from "./enums";

export const knowledgeItemCreate = z.object({
  projectId: z.string().min(1),
  type: knowledgeItemType,
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case a-z0-9"),
  bodyMd: z.string(),
  tags: z.array(z.string().min(1)),
  metadata: z.record(z.string(), z.unknown()),
});

export const knowledgeItemUpdate = knowledgeItemCreate.partial();

export type KnowledgeItemCreateInput = z.infer<typeof knowledgeItemCreate>;
export type KnowledgeItemUpdateInput = z.infer<typeof knowledgeItemUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("knowledgeItemCreate", () => {
    it("parses a well-formed knowledge item", () => {
      const parsed = knowledgeItemCreate.parse({
        projectId: "p1",
        type: "concept",
        title: "CAP Theorem",
        slug: "cap-theorem",
        bodyMd: "...",
        tags: ["distributed"],
        metadata: { source: "textbook" },
      });
      expect(parsed.slug).toBe("cap-theorem");
    });

    it("rejects a non-kebab slug", () => {
      expect(() =>
        knowledgeItemCreate.parse({
          projectId: "p1",
          type: "concept",
          title: "X",
          slug: "Not Kebab",
          bodyMd: "",
          tags: [],
          metadata: {},
        }),
      ).toThrow();
    });
  });
}
