export type SeedExitCode = 0 | 1 | 2 | 3 | 4;

export class SeedError extends Error {
  readonly exitCode: Exclude<SeedExitCode, 0>;
  readonly details: string[];
  readonly causeValue?: unknown;

  constructor(
    exitCode: Exclude<SeedExitCode, 0>,
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

export function isSeedError(error: unknown): error is SeedError {
  return error instanceof SeedError;
}
