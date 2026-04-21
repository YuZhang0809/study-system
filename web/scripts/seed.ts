import { readFile } from "node:fs/promises";
import path from "node:path";
import { SeedError, type SeedExitCode, isSeedError } from "../lib/seed/error";
import { parsePlanYamlSource } from "../lib/seed/plan-yaml-schema";

type SeedCliArgs = {
  planPath: string;
  dryRun: boolean;
};

function parseCliArgs(argv: readonly string[]): SeedCliArgs {
  let planPath: string | null = null;
  let dryRun = false;

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

  throw new SeedError(3, "seed resolver is not implemented yet", [
    `yaml path: ${sourcePath}`,
    `project: ${plan.project.name}`,
    `dry run: ${args.dryRun ? "yes" : "no"}`,
  ]);
}

function printError(error: SeedError): void {
  console.error(`seed failed (${error.exitCode}): ${error.message}`);

  for (const detail of error.details) {
    console.error(`  ${detail}`);
  }

  if (process.env.SEED_DEBUG === "1" && error.causeValue !== undefined) {
    console.error("debug:");
    console.error(error.causeValue);
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
    process.env.SEED_DEBUG === "1" ? [String(error)] : [],
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
