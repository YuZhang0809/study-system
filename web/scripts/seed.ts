type ExitCode = 0 | 1 | 2 | 3 | 4;

type SeedCliArgs = {
  planPath: string;
  dryRun: boolean;
};

class SeedError extends Error {
  readonly exitCode: Exclude<ExitCode, 0>;
  readonly details: string[];
  readonly causeValue?: unknown;

  constructor(
    exitCode: Exclude<ExitCode, 0>,
    message: string,
    details: string[] = [],
    causeValue?: unknown,
  ) {
    super(message);
    this.name = "SeedError";
    this.exitCode = exitCode;
    this.details = details;
    this.causeValue = causeValue;
  }
}

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
  throw new SeedError(1, "seed CLI is not implemented yet", [
    `yaml path: ${args.planPath}`,
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
  if (error instanceof SeedError) {
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

async function main(): Promise<ExitCode> {
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
