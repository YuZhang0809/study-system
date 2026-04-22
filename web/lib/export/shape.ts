import type {
  Artifact,
  Blocker,
  Bookmark,
  DailyLog,
  KnowledgeItem,
  OpenItem,
  Retro,
  WeeklyLog,
} from "@prisma/client";

export type SerializedValue<T> =
  T extends Date ? string
  : T extends bigint ? number
  : T extends Array<infer U> ? SerializedValue<U>[]
  : T extends object ? { [K in keyof T]: SerializedValue<T[K]> }
  : T;

export const EXPORT_TABLE_KEYS = [
  "daily_log",
  "weekly_log",
  "retro",
  "knowledge_item",
  "artifact",
  "open_item",
  "blocker",
  "bookmark",
] as const;

export type ExportTableKey = (typeof EXPORT_TABLE_KEYS)[number];

export type DailyLogRow = SerializedValue<DailyLog>;
export type WeeklyLogRow = SerializedValue<WeeklyLog>;
export type RetroRow = SerializedValue<Retro>;
export type KnowledgeItemRow = SerializedValue<KnowledgeItem>;
export type ArtifactRow = SerializedValue<Artifact>;
export type OpenItemRow = SerializedValue<OpenItem>;
export type BlockerRow = SerializedValue<Blocker>;
export type BookmarkRow = SerializedValue<Bookmark>;

export interface SchemaVersionMigration {
  id: string;
  checksum: string;
  finished_at: string | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: string | null;
  started_at: string;
  applied_steps_count: number;
}

export interface ExportTables {
  daily_log: DailyLogRow[];
  weekly_log: WeeklyLogRow[];
  retro: RetroRow[];
  knowledge_item: KnowledgeItemRow[];
  artifact: ArtifactRow[];
  open_item: OpenItemRow[];
  blocker: BlockerRow[];
  bookmark: BookmarkRow[];
}

export interface ExportEnvelope {
  schema_version: {
    migrations: SchemaVersionMigration[];
    committed_migrations_count: number;
  };
  exported_at: string;
  tables: ExportTables;
}

if (import.meta.vitest) {
  const { describe, expect, expectTypeOf, it } = import.meta.vitest;

  describe("export shape", () => {
    it("locks the table key order", () => {
      expect(EXPORT_TABLE_KEYS).toEqual([
        "daily_log",
        "weekly_log",
        "retro",
        "knowledge_item",
        "artifact",
        "open_item",
        "blocker",
        "bookmark",
      ]);
    });

    it("derives serialized row types from the Prisma model shapes", () => {
      expectTypeOf<DailyLogRow["date"]>().toEqualTypeOf<string>();
      expectTypeOf<WeeklyLogRow["weekStart"]>().toEqualTypeOf<string>();
      expectTypeOf<RetroRow["createdAt"]>().toEqualTypeOf<string>();
      expectTypeOf<KnowledgeItemRow["updatedAt"]>().toEqualTypeOf<string>();
      expectTypeOf<ArtifactRow["createdAt"]>().toEqualTypeOf<string>();
      expectTypeOf<OpenItemRow["openedAt"]>().toEqualTypeOf<string>();
      expectTypeOf<BlockerRow["resolvedAt"]>().toEqualTypeOf<string | null>();
      expectTypeOf<BookmarkRow["createdAt"]>().toEqualTypeOf<string>();
    });
  });
}
