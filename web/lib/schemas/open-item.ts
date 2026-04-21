import { z } from "zod";
import { openItemStatus } from "./enums";

export const openItemCreate = z.object({
  projectId: z.string().min(1),
  text: z.string().min(1),
  openedAt: z.coerce.date(),
  source: z.string().min(1),
  status: openItemStatus,
});

export const openItemUpdate = openItemCreate.partial();

export type OpenItemCreateInput = z.infer<typeof openItemCreate>;
export type OpenItemUpdateInput = z.infer<typeof openItemUpdate>;

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("openItemCreate", () => {
    it("parses a well-formed open item", () => {
      const parsed = openItemCreate.parse({
        projectId: "p1",
        text: "draft seed CLI",
        openedAt: "2026-04-21",
        source: "daily_log",
        status: "open",
      });
      expect(parsed.status).toBe("open");
    });

    it("rejects an unknown status", () => {
      expect(() =>
        openItemCreate.parse({
          projectId: "p1",
          text: "x",
          openedAt: "2026-04-21",
          source: "daily_log",
          status: "pending",
        }),
      ).toThrow();
    });
  });
}
