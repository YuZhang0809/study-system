"use server";

import { revalidatePath } from "next/cache";
import type { ZodIssue } from "zod";
import { getPrismaClient } from "../prisma";
import {
  retroCreate,
  type RetroCreateInput,
  type RetroCreateRawInput,
  type RetroScopeChangeInput,
} from "../schemas/retro";

type RetroMetricKey = keyof RetroCreateInput["metrics"];
type RetroScoreKey = keyof RetroCreateInput["selfScores"];
type RetroQuestionKey = keyof RetroCreateInput["threeQuestions"];
type RetroScopeFieldKey = keyof RetroScopeChangeInput;

export interface RetroFieldErrors {
  segmentId?: string[];
  metrics?: Partial<Record<RetroMetricKey, string[]>>;
  selfScores?: Partial<Record<RetroScoreKey, string[]>>;
  threeQuestions?: Partial<Record<RetroQuestionKey, string[]>>;
  scopeChanges?: Array<Partial<Record<RetroScopeFieldKey, string[]>> | undefined>;
  nextPhaseFirstThing?: string[];
}

export type RetroActionResult = { ok: true } | { ok: false; fieldErrors: RetroFieldErrors };

export async function upsertRetro(input: RetroCreateRawInput): Promise<RetroActionResult> {
  const parsed = retroCreate.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: mapFieldErrors(parsed.error.issues),
    };
  }

  const payload = parsed.data;
  const prisma = getPrismaClient();

  await prisma.retro.upsert({
    where: { segmentId: payload.segmentId },
    update: {
      metrics: payload.metrics,
      selfScores: payload.selfScores,
      threeQuestions: payload.threeQuestions,
      scopeChanges: payload.scopeChanges,
      nextPhaseFirstThing: payload.nextPhaseFirstThing,
    },
    create: {
      metrics: payload.metrics,
      selfScores: payload.selfScores,
      threeQuestions: payload.threeQuestions,
      scopeChanges: payload.scopeChanges,
      nextPhaseFirstThing: payload.nextPhaseFirstThing,
      segment: {
        connect: { id: payload.segmentId },
      },
    },
  });

  revalidatePath("/retros");

  return { ok: true };
}

function mapFieldErrors(issues: ZodIssue[]): RetroFieldErrors {
  const fieldErrors: RetroFieldErrors = {};

  for (const issue of issues) {
    const [scope, field, nested] = issue.path;

    if (scope === "metrics" && typeof field === "string") {
      const metrics = (fieldErrors.metrics ??= {});
      metrics[field as RetroMetricKey] = [...(metrics[field as RetroMetricKey] ?? []), issue.message];
      continue;
    }

    if (scope === "selfScores" && typeof field === "string") {
      const selfScores = (fieldErrors.selfScores ??= {});
      selfScores[field as RetroScoreKey] = [...(selfScores[field as RetroScoreKey] ?? []), issue.message];
      continue;
    }

    if (scope === "threeQuestions" && typeof field === "string") {
      const threeQuestions = (fieldErrors.threeQuestions ??= {});
      threeQuestions[field as RetroQuestionKey] = [
        ...(threeQuestions[field as RetroQuestionKey] ?? []),
        issue.message,
      ];
      continue;
    }

    if (scope === "scopeChanges" && typeof field === "number" && typeof nested === "string") {
      const scopeChanges = (fieldErrors.scopeChanges ??= []);
      const row = (scopeChanges[field] ??= {});
      row[nested as RetroScopeFieldKey] = [...(row[nested as RetroScopeFieldKey] ?? []), issue.message];
      continue;
    }

    if (scope === "segmentId" || scope === "nextPhaseFirstThing") {
      fieldErrors[scope] = [...(fieldErrors[scope] ?? []), issue.message];
    }
  }

  return fieldErrors;
}
