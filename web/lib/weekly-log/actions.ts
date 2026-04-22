"use server";

import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { getPrismaClient } from "../prisma";
import { weeklyLogCreate, type WeeklyLogCreateInput, type WeeklyLogCreateRawInput } from "../schemas/weekly-log";
import { isoWeekStart } from "./presentation";

type ReflectionKey = keyof WeeklyLogCreateInput["reflections"];

export interface WeeklyLogFieldErrors {
  projectId?: string[];
  weekStart?: string[];
  reflections?: Partial<Record<ReflectionKey, string[]>>;
  selfScores?: Record<string, string[] | undefined>;
}

export type WeeklyLogActionResult =
  | { ok: true }
  | { ok: false; fieldErrors: WeeklyLogFieldErrors };

export async function upsertWeeklyLog(input: WeeklyLogCreateRawInput): Promise<WeeklyLogActionResult> {
  const parsed = weeklyLogCreate.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: mapFieldErrors(parsed.error.issues),
    };
  }

  const payload = parsed.data;
  const weekStart = isoWeekStart(payload.weekStart);
  const prisma = getPrismaClient();

  await prisma.weeklyLog.upsert({
    where: {
      projectId_weekStart: {
        projectId: payload.projectId,
        weekStart,
      },
    },
    update: {
      reflections: payload.reflections,
      selfScores: payload.selfScores,
    },
    create: {
      projectId: payload.projectId,
      weekStart,
      reflections: payload.reflections,
      selfScores: payload.selfScores,
    },
  });

  revalidatePath("/retros");

  return { ok: true };
}

function mapFieldErrors(issues: ZodIssue[]): WeeklyLogFieldErrors {
  const fieldErrors: WeeklyLogFieldErrors = {};

  for (const issue of issues) {
    const [scope, field] = issue.path;

    if (scope === "reflections" && typeof field === "string") {
      const reflections = (fieldErrors.reflections ??= {});
      reflections[field as ReflectionKey] = [...(reflections[field as ReflectionKey] ?? []), issue.message];
      continue;
    }

    if (scope === "selfScores" && typeof field === "string") {
      const selfScores = (fieldErrors.selfScores ??= {});
      selfScores[field] = [...(selfScores[field] ?? []), issue.message];
      continue;
    }

    if (scope === "projectId" || scope === "weekStart") {
      fieldErrors[scope] = [...(fieldErrors[scope] ?? []), issue.message];
    }
  }

  return fieldErrors;
}
