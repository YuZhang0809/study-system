import { z } from "zod";

export const projectStatus = z.enum(["pre_start", "active", "done", "paused"]);
export type ProjectStatus = z.infer<typeof projectStatus>;

export const projectHasPlanStructure = z.enum(["full", "segments_only", "open"]);
export type ProjectHasPlanStructure = z.infer<typeof projectHasPlanStructure>;

export const knowledgeItemType = z.enum(["learning", "concept", "bug", "prompt"]);
export type KnowledgeItemType = z.infer<typeof knowledgeItemType>;

export const openItemStatus = z.enum(["open", "done", "dropped"]);
export type OpenItemStatus = z.infer<typeof openItemStatus>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("enums", () => {
    it("accepts valid values", () => {
      expect(projectStatus.parse("active")).toBe("active");
      expect(projectHasPlanStructure.parse("open")).toBe("open");
      expect(knowledgeItemType.parse("bug")).toBe("bug");
      expect(openItemStatus.parse("dropped")).toBe("dropped");
    });

    it("rejects values outside the enum", () => {
      expect(() => projectStatus.parse("archived")).toThrow();
      expect(() => projectHasPlanStructure.parse("partial")).toThrow();
      expect(() => knowledgeItemType.parse("note")).toThrow();
      expect(() => openItemStatus.parse("closed")).toThrow();
    });
  });
}
