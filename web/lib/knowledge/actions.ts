"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrismaClient } from "../prisma";
import { knowledgeItemType } from "../schemas/enums";
import { inferArtifactKind } from "./artifact-kind";
import { deriveSlug, resolveSlugCollision } from "./slug";

const createKnowledgeItemSchema = z.object({
  projectId: z.string().min(1, "项目缺失"),
  type: knowledgeItemType,
  title: z.string().trim().min(1, "标题必填").max(60, "标题最多 60 字"),
  bodyMd: z.string().trim().min(1, "正文必填"),
  urlOrPath: z.string().trim().max(500, "产出指针最多 500 字").optional(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "标签不能为空")
        .max(32, "标签最多 32 字")
        .regex(/^[^\s,]+$/u, "标签不能包含空格或逗号"),
    )
    .max(12, "最多 12 个标签"),
});

export interface CreateKnowledgeItemResult {
  ok: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createKnowledgeItem(formData: FormData): Promise<CreateKnowledgeItemResult> {
  const parsed = createKnowledgeItemSchema.safeParse({
    projectId: getFormString(formData, "projectId"),
    type: getFormString(formData, "type"),
    title: getFormString(formData, "title"),
    bodyMd: getFormString(formData, "bodyMd"),
    urlOrPath: getOptionalFormString(formData, "urlOrPath"),
    tags: normalizeTags(formData.getAll("tags")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prisma = getPrismaClient();
  const payload = parsed.data;

  await prisma.$transaction(async (tx) => {
    const baseSlug = deriveSlug(payload.title);
    const slug = await resolveSlugCollision(payload.projectId, baseSlug, tx);
    const knowledgeItem = await tx.knowledgeItem.create({
      data: {
        projectId: payload.projectId,
        type: payload.type,
        title: payload.title,
        slug,
        bodyMd: payload.bodyMd,
        tags: payload.tags,
        metadata: {},
      },
    });

    if (payload.urlOrPath) {
      await tx.artifact.create({
        data: {
          ownerType: "knowledge_item",
          ownerId: knowledgeItem.id,
          kind: inferArtifactKind(payload.urlOrPath),
          urlOrPath: payload.urlOrPath,
        },
      });
    }
  });

  revalidatePath("/knowledge");
  revalidatePath("/today");

  return { ok: true };
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getOptionalFormString(formData: FormData, key: string): string | undefined {
  const value = getFormString(formData, key).trim();
  return value.length > 0 ? value : undefined;
}

function normalizeTags(values: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    tags.push(trimmed);
  }

  return tags;
}
