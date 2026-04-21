import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";

const MAX_SLUG_LENGTH = 60;

interface SlugPrisma {
  knowledgeItem: Pick<PrismaClient["knowledgeItem"], "findUnique">;
}

export function deriveSlug(title: string): string {
  const normalized = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();

  const kebab = normalized
    .replace(/[^a-z0-9\s-]/gu, " ")
    .trim()
    .replace(/[\s-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/gu, "");

  return kebab || "item";
}

export async function resolveSlugCollision(
  projectId: string,
  baseSlug: string,
  prisma: SlugPrisma = getPrismaClient(),
): Promise<string> {
  const normalizedBase = baseSlug || "item";
  const existing = await prisma.knowledgeItem.findUnique({
    where: {
      projectId_slug: {
        projectId,
        slug: normalizedBase,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return normalizedBase;
  }

  for (let suffix = 2; ; suffix += 1) {
    const candidate = withCollisionSuffix(normalizedBase, suffix);
    const collision = await prisma.knowledgeItem.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug: candidate,
        },
      },
      select: { id: true },
    });

    if (!collision) {
      return candidate;
    }
  }
}

function withCollisionSuffix(baseSlug: string, suffixNumber: number): string {
  const suffix = `-${suffixNumber}`;
  const trimmedBase = baseSlug
    .slice(0, Math.max(1, MAX_SLUG_LENGTH - suffix.length))
    .replace(/-+$/gu, "");

  return `${trimmedBase || "item"}${suffix}`;
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("deriveSlug", () => {
    it("lowercases and kebab-cases ASCII titles", () => {
      expect(deriveSlug("Render Pipeline Notes")).toBe("render-pipeline-notes");
    });

    it("removes punctuation and collapses separators", () => {
      expect(deriveSlug("  Hello, world!!! -- again  ")).toBe("hello-world-again");
    });

    it("strips leading and trailing dashes after normalization", () => {
      expect(deriveSlug("--- keep --- edges ---")).toBe("keep-edges");
    });

    it("falls back to item when the title has no latin letters or digits", () => {
      expect(deriveSlug("只写中文")).toBe("item");
      expect(deriveSlug("？？？")).toBe("item");
    });

    it("caps long slugs at 60 characters without trailing dashes", () => {
      const slug = deriveSlug("one two three four five six seven eight nine ten eleven twelve");
      expect(slug.length).toBeLessThanOrEqual(60);
      expect(slug.endsWith("-")).toBe(false);
    });

    it("normalizes accented latin characters before stripping", () => {
      expect(deriveSlug("Crème Brûlée Notes")).toBe("creme-brulee-notes");
    });
  });
}
