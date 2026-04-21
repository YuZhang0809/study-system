import { readFile } from "node:fs/promises";
import path from "node:path";
import { applySeedPlan } from "../lib/seed/writer";
import { createSeedPrismaClient } from "../lib/seed/prisma";
import { readSeedSnapshot } from "../lib/seed/reader";
import { SeedError, type SeedExitCode, isSeedError } from "../lib/seed/error";
import { parsePlanYamlSource } from "../lib/seed/plan-yaml-schema";
import type { FieldDiff, SeedPlan } from "../lib/seed/resolver";
import { resolveSeedPlan } from "../lib/seed/resolver";

type SeedCliArgs = {
  planPath: string;
  dryRun: boolean;
};

function parseCliArgs(argv: readonly string[]): SeedCliArgs {
  let planPath: string | null = null;
  let dryRun = process.env.npm_config_dry_run === "true";

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new SeedError(1, `unknown flag: ${arg}`, [
        "usage: npm run seed -- <path> [--dry-run]",
      ]);
    }

    if (planPath !== null) {
      throw new SeedError(1, "expected exactly one yaml path", [
        `received extra argument: ${arg}`,
        "usage: npm run seed -- <path> [--dry-run]",
      ]);
    }

    planPath = arg;
  }

  if (planPath === null) {
    throw new SeedError(1, "missing yaml path", [
      "usage: npm run seed -- <path> [--dry-run]",
    ]);
  }

  return { planPath, dryRun };
}

async function runSeed(args: SeedCliArgs): Promise<void> {
  const sourcePath = path.resolve(process.cwd(), args.planPath);

  let source: string;
  try {
    source = await readFile(sourcePath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new SeedError(1, `yaml file not found: ${args.planPath}`, [`resolved path: ${sourcePath}`], error);
    }

    throw new SeedError(
      1,
      `failed to read yaml file: ${args.planPath}`,
      [`resolved path: ${sourcePath}`],
      error,
    );
  }

  const plan = parsePlanYamlSource(source, sourcePath);
  const prisma = createSeedPrismaClient();

  try {
    const snapshot = await readSeedSnapshot(prisma, plan.project.name);
    const seedPlan = resolveSeedPlan(plan, snapshot);

    if (!args.dryRun) {
      await applySeedPlan(prisma, seedPlan);
    }

    printPlanReport(seedPlan, args.dryRun);

    if (process.env.SEED_DEBUG === "1") {
      console.log(JSON.stringify(seedPlan, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

function printError(error: SeedError): void {
  console.error(`seed failed (${error.exitCode}): ${error.message}`);

  for (const detail of error.details) {
    console.error(`  ${detail}`);
  }

  if (process.env.SEED_DEBUG === "1" && error.causeValue !== undefined) {
    console.error("debug:");
    if (error.causeValue instanceof Error) {
      console.error(error.causeValue.stack ?? error.causeValue.message);
    } else {
      console.error(error.causeValue);
    }
  }
}

function normalizeError(error: unknown): SeedError {
  if (isSeedError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new SeedError(
      3,
      "unexpected seed error",
      process.env.SEED_DEBUG === "1" ? [error.message] : [],
      error,
    );
  }

  return new SeedError(
    3,
    "unexpected seed error",
    process.env.SEED_DEBUG === "1" ? [error instanceof Error ? error.message : String(error)] : [],
    error,
  );
}

async function main(): Promise<SeedExitCode> {
  const args = parseCliArgs(process.argv.slice(2));
  await runSeed(args);
  return 0;
}

void main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    const seedError = normalizeError(error);
    printError(seedError);
    process.exitCode = seedError.exitCode;
  });

function printPlanReport(plan: SeedPlan, dryRun: boolean): void {
  const lines: string[] = [];
  const projectAction = formatAction(plan.project.action);

  if (plan.project.action !== "noop") {
    lines.push(`project "${plan.project.data.name}"  ${projectAction}`);
    lines.push(...renderDiffLines(plan.project.diffs));
    lines.push("");
  }

  const segmentEntries = plan.segments.filter((segment) => segment.action !== "noop");
  if (segmentEntries.length > 0) {
    lines.push("segments:");
    for (const segment of segmentEntries) {
      lines.push(`  order=${segment.key.order}  ${formatAction(segment.action)}   "${segment.data.name}"`);
      lines.push(...renderDiffLines(segment.diffs, "    "));
      if (
        segment.action === "update" ||
        segment.userImpact.daysInRangeWithDailyLogs > 0 ||
        segment.userImpact.retros > 0
      ) {
        lines.push(
          `    (touches ${segment.userImpact.daysInRangeWithDailyLogs} daily_logs whose phase membership will shift; touches ${segment.userImpact.retros} retros)`,
        );
      }
    }
    lines.push("");
  }

  const dayEntries = plan.days.filter((day) => day.action !== "noop");
  if (dayEntries.length > 0) {
    lines.push("days:");
    for (const day of dayEntries) {
      lines.push(`  ${day.key.date}  ${formatAction(day.action)}   "${day.data.title}"`);
      lines.push(...renderDiffLines(day.diffs, "    "));
      if (day.action === "update" || day.userImpact.dailyLogs > 0) {
        const noun = day.userImpact.dailyLogs === 1 ? "daily_log" : "daily_logs";
        lines.push(`    (${day.userImpact.dailyLogs} ${noun} already written for this date)`);
      }
    }
    lines.push("");
  }

  const orphanCount = plan.orphans.segments.length + plan.orphans.days.length;
  if (orphanCount > 0) {
    lines.push("orphans (present in DB, absent from yaml - NOT touched, NOT deleted):");
    for (const segment of plan.orphans.segments) {
      lines.push(
        `  segment order=${segment.order}  "${segment.name}"   (${segment.daysInRangeWithDailyLogs} daily_logs in range)`,
      );
    }
    for (const day of plan.orphans.days) {
      const noun = day.dailyLogs === 1 ? "daily_log" : "daily_logs";
      lines.push(`  day     ${day.date}                 (${day.dailyLogs} ${noun} already written)`);
    }
    lines.push("");
  }

  if (dryRun) {
    lines.push("DRY RUN - no writes performed.");
  } else {
    const summary = summarizePlan(plan);
    lines.push(
      `summary: inserted ${summary.inserted} / updated ${summary.updated} / noop ${summary.noop} / orphans ${summary.orphans}`,
    );
  }

  console.log(lines.join("\n"));
}

function summarizePlan(plan: SeedPlan) {
  const actions = [plan.project.action, ...plan.segments.map((segment) => segment.action), ...plan.days.map((day) => day.action)];

  return {
    inserted: actions.filter((action) => action === "insert").length,
    updated: actions.filter((action) => action === "update").length,
    noop: actions.filter((action) => action === "noop").length,
    orphans: plan.orphans.segments.length + plan.orphans.days.length,
  };
}

function renderDiffLines(diffs: FieldDiff[], indent = "  "): string[] {
  return diffs.map(
    (diff) => `${indent}${diff.field}  ${formatDiffValue(diff.from)} -> ${formatDiffValue(diff.to)}`,
  );
}

function formatAction(action: SeedPlan["project"]["action"]): string {
  return action.toUpperCase();
}

function formatDiffValue(value: unknown): string {
  if (typeof value === "string") {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : `"${value}"`;
  }

  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return JSON.stringify(value);
}
