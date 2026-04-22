import { describe, expect, it } from "vitest";
import type { ExportEnvelope } from "../lib/export/shape";
import { serializeExport } from "../lib/export/serialize";

const envelope: ExportEnvelope = {
  schema_version: {
    migrations: [
      {
        id: "migration-1",
        checksum: "checksum-1",
        finished_at: "2026-04-22T11:04:20.300Z",
        migration_name: "20260421160000_initial",
        logs: null,
        rolled_back_at: null,
        started_at: "2026-04-22T11:04:20.200Z",
        applied_steps_count: 1,
      },
    ],
    committed_migrations_count: 4,
  },
  exported_at: "2026-04-22T12:34:56.789Z",
  tables: {
    daily_log: [
      {
        id: "daily-1",
        projectId: "project-1",
        date: "2026-05-03T00:00:00.000Z",
        whatDone: ["read plan"],
        whatSkipped: [],
        timeSpentMinutes: 30,
        tomorrowFirstThing: "write tests",
        honestyNote: null,
        createdAt: "2026-05-03T00:01:00.000Z",
        updatedAt: "2026-05-03T00:02:00.000Z",
      },
    ],
    weekly_log: [],
    retro: [],
    knowledge_item: [],
    artifact: [],
    open_item: [],
    blocker: [],
    bookmark: [],
  },
};

describe("serializeExport", () => {
  it("produces byte-identical JSON for repeated calls on the same envelope", () => {
    expect(serializeExport(envelope)).toBe(serializeExport(envelope));
  });

  it("round-trips through JSON.parse without changing the envelope", () => {
    expect(JSON.parse(serializeExport(envelope))).toEqual(envelope);
  });
});
