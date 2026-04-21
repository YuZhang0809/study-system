"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrismaClient } from "../prisma";
import { blockerCreate } from "../schemas/blocker";
import { dailyLogCreate } from "../schemas/daily-log";
import { openItemCreate } from "../schemas/open-item";
import { startOfLocalDay } from "../today/driving-seat";
import { findCarriedForwardOpenItem, getYesterdayPromise } from "./queries";

const dailyLogActionSchema = dailyLogCreate.extend({
  projectId: z.string().trim().min(1, "项目缺失"),
  whatDone: z
    .array(z.string().trim().min(1, "今天做了什么不能为空").max(200, "单项最多 200 字"))
    .max(20, "今天做了什么最多 20 项"),
  whatSkipped: z
    .array(z.string().trim().min(1, "今天没做什么不能为空").max(200, "单项最多 200 字"))
    .max(20, "今天没做什么最多 20 项"),
  timeSpentMinutes: z.number({ error: "用时必填" }).int("用时必须是整数").nonnegative("用时不能为负数"),
  tomorrowFirstThing: z.string().trim().min(1, "明天第一件事必填").max(240, "明天第一件事最多 240 字"),
  honestyNote: z
    .string()
    .trim()
    .max(2000, "诚实笔记最多 2000 字")
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const createOpenItemSchema = openItemCreate.extend({
  projectId: z.string().trim().min(1, "项目缺失"),
  text: z.string().trim().min(1, "内容必填").max(500, "内容最多 500 字"),
  source: z.literal("manual"),
  status: z.literal("open"),
});

const carryForwardOpenItemSchema = openItemCreate.extend({
  projectId: z.string().trim().min(1, "项目缺失"),
  text: z.string().trim().min(1, "内容必填").max(500, "内容最多 500 字"),
  source: z.literal("daily_log"),
  status: z.literal("open"),
});

const createBlockerSchema = blockerCreate.extend({
  projectId: z.string().trim().min(1, "项目缺失"),
  text: z.string().trim().min(1, "内容必填").max(500, "内容最多 500 字"),
  resolvedAt: z.null(),
});

const recordIdSchema = z.object({
  id: z.string().trim().min(1, "条目缺失"),
});

type FieldErrors = Record<string, string[] | undefined>;

export interface DailyLogActionResult {
  ok: boolean;
  deduped?: boolean;
  fieldErrors?: FieldErrors;
}

export interface RowActionInput {
  projectId: string;
  text: string;
}

export interface RowActionResult {
  ok: boolean;
  deduped?: boolean;
  fieldErrors?: FieldErrors;
}

export interface RecordActionResult {
  ok: boolean;
  fieldErrors?: FieldErrors;
}

export async function upsertDailyLog(formData: FormData): Promise<DailyLogActionResult> {
  const parsed = dailyLogActionSchema.safeParse({
    projectId: getFormString(formData, "projectId"),
    date: getFormString(formData, "date"),
    whatDone: getStringList(formData.getAll("whatDone")),
    whatSkipped: getStringList(formData.getAll("whatSkipped")),
    timeSpentMinutes: getOptionalInteger(formData, "timeSpentMinutes"),
    tomorrowFirstThing: getFormString(formData, "tomorrowFirstThing"),
    honestyNote: getNullableFormString(formData, "honestyNote"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prisma = getPrismaClient();
  const payload = parsed.data;

  await prisma.dailyLog.upsert({
    where: {
      projectId_date: {
        projectId: payload.projectId,
        date: payload.date,
      },
    },
    update: {
      whatDone: payload.whatDone,
      whatSkipped: payload.whatSkipped,
      timeSpentMinutes: payload.timeSpentMinutes,
      tomorrowFirstThing: payload.tomorrowFirstThing,
      honestyNote: payload.honestyNote,
    },
    create: {
      projectId: payload.projectId,
      date: payload.date,
      whatDone: payload.whatDone,
      whatSkipped: payload.whatSkipped,
      timeSpentMinutes: payload.timeSpentMinutes,
      tomorrowFirstThing: payload.tomorrowFirstThing,
      honestyNote: payload.honestyNote,
    },
  });

  revalidatePath("/today");

  return { ok: true };
}

export async function carryForwardYesterdayPromise({
  projectId,
}: {
  projectId: string;
}): Promise<RowActionResult> {
  const baseParsed = z
    .object({
      projectId: z.string().trim().min(1, "项目缺失"),
    })
    .safeParse({ projectId });

  if (!baseParsed.success) {
    return {
      ok: false,
      fieldErrors: baseParsed.error.flatten().fieldErrors,
    };
  }

  const today = startOfLocalDay(new Date());
  const prisma = getPrismaClient();
  const promise = await getYesterdayPromise(baseParsed.data.projectId, today, prisma);

  if (!promise) {
    revalidatePath("/today");
    return { ok: true };
  }

  const openItemParsed = carryForwardOpenItemSchema.safeParse({
    projectId: baseParsed.data.projectId,
    text: promise.text,
    openedAt: today,
    source: "daily_log",
    status: "open",
  });

  if (!openItemParsed.success) {
    return {
      ok: false,
      fieldErrors: openItemParsed.error.flatten().fieldErrors,
    };
  }

  const existing = await findCarriedForwardOpenItem(
    openItemParsed.data.projectId,
    openItemParsed.data.text,
    prisma,
  );

  if (existing) {
    revalidatePath("/today");
    return { ok: true, deduped: true };
  }

  await prisma.openItem.create({
    data: openItemParsed.data,
  });

  revalidatePath("/today");

  return { ok: true };
}

export async function createOpenItem(input: RowActionInput): Promise<RowActionResult> {
  const today = startOfLocalDay(new Date());
  const parsed = createOpenItemSchema.safeParse({
    projectId: input.projectId,
    text: input.text,
    openedAt: today,
    source: "manual",
    status: "open",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prisma = getPrismaClient();
  await prisma.openItem.create({
    data: parsed.data,
  });

  revalidatePath("/today");

  return { ok: true };
}

export async function closeOpenItem({ id }: { id: string }): Promise<RecordActionResult> {
  const parsed = recordIdSchema.safeParse({ id });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prisma = getPrismaClient();
  await prisma.openItem.updateMany({
    where: {
      id: parsed.data.id,
      status: "open",
    },
    data: {
      status: "done",
    },
  });

  revalidatePath("/today");

  return { ok: true };
}

export async function createBlocker(input: RowActionInput): Promise<RowActionResult> {
  const today = startOfLocalDay(new Date());
  const parsed = createBlockerSchema.safeParse({
    projectId: input.projectId,
    text: input.text,
    openedAt: today,
    resolvedAt: null,
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prisma = getPrismaClient();
  await prisma.blocker.create({
    data: parsed.data,
  });

  revalidatePath("/today");

  return { ok: true };
}

export async function resolveBlocker({ id }: { id: string }): Promise<RecordActionResult> {
  const parsed = recordIdSchema.safeParse({ id });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const prisma = getPrismaClient();
  await prisma.blocker.updateMany({
    where: {
      id: parsed.data.id,
      resolvedAt: null,
    },
    data: {
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/today");

  return { ok: true };
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getNullableFormString(formData: FormData, key: string): string | null {
  const value = getFormString(formData, key).trim();
  return value.length > 0 ? value : null;
}

function getStringList(values: FormDataEntryValue[]): string[] {
  return values.flatMap((value) => {
    if (typeof value !== "string") {
      return [];
    }

    return [value.trim()];
  });
}

function getOptionalInteger(formData: FormData, key: string): number | undefined {
  const raw = getFormString(formData, key).trim();

  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}
