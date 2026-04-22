// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "../app/settings/page";
import type { ExportEnvelope } from "../lib/export/shape";
import { formatExportSummary } from "../lib/export/presentation";
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

const responseText = serializeExport(envelope);

let createObjectUrlMock: ReturnType<typeof vi.fn>;
let revokeObjectUrlMock: ReturnType<typeof vi.fn>;
let anchorClickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  createObjectUrlMock = vi.fn(() => "blob:study-system-export");
  revokeObjectUrlMock = vi.fn();
  anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      text: async () => responseText,
    })),
  );

  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: createObjectUrlMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: revokeObjectUrlMock,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  anchorClickSpy.mockRestore();
});

describe("/settings page", () => {
  it("renders the export button and triggers the browser download flow", async () => {
    render(SettingsPage());

    fireEvent.click(screen.getByRole("button", { name: "导出 JSON" }));

    const expectedSummary = formatExportSummary(
      {
        daily_log: 1,
        weekly_log: 0,
        retro: 0,
        knowledge_item: 0,
        artifact: 0,
        open_item: 0,
        blocker: 0,
        bookmark: 0,
      },
      new Blob([responseText], { type: "application/json; charset=utf-8" }).size,
    );

    expect(await screen.findByText(expectedSummary)).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith("/api/export");
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledTimes(1);
  });
});
