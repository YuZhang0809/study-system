import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import { knowledgeItemType, type KnowledgeItemType } from "../schemas/enums";

const KNOWLEDGE_LIST_LIMIT = 200;
const KNOWLEDGE_RECENT_LIMIT = 5;

export type KnowledgeFilterType = KnowledgeItemType | "all";

export interface KnowledgeCounts {
  total: number;
  learning: number;
  concept: number;
  bug: number;
  prompt: number;
}

export interface KnowledgeListItem {
  id: string;
  type: KnowledgeItemType;
  title: string;
  bodyMd: string;
  excerpt: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  artifactCount: number;
}

export interface KnowledgeListResult {
  items: KnowledgeListItem[];
  truncated: boolean;
}

export interface RecentKnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  title: string;
  createdAt: Date;
}

export async function listKnowledgeForProject(
  projectId: string,
  type: KnowledgeFilterType,
  prisma: PrismaClient = getPrismaClient(),
): Promise<KnowledgeListResult> {
  const rows = await prisma.knowledgeItem.findMany({
    where: {
      projectId,
      ...(type === "all" ? {} : { type }),
    },
    orderBy: { createdAt: "desc" },
    take: KNOWLEDGE_LIST_LIMIT + 1,
    select: {
      id: true,
      type: true,
      title: true,
      bodyMd: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const truncated = rows.length > KNOWLEDGE_LIST_LIMIT;
  const items = rows.slice(0, KNOWLEDGE_LIST_LIMIT);
  const artifactCounts = await countArtifactsByOwner(
    items.map((item) => item.id),
    prisma,
  );

  return {
    items: items.map((item) => ({
      id: item.id,
      type: parseKnowledgeType(item.type),
      title: item.title,
      bodyMd: item.bodyMd,
      excerpt: buildExcerpt(item.bodyMd),
      tags: parseTags(item.tags),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      artifactCount: artifactCounts.get(item.id) ?? 0,
    })),
    truncated,
  };
}

export async function listRecentKnowledgeForToday(
  projectId: string,
  prisma: PrismaClient = getPrismaClient(),
): Promise<RecentKnowledgeItem[]> {
  const rows = await prisma.knowledgeItem.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: KNOWLEDGE_RECENT_LIMIT,
    select: {
      id: true,
      type: true,
      title: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    type: parseKnowledgeType(row.type),
    title: row.title,
    createdAt: row.createdAt,
  }));
}

export async function countByType(
  projectId: string,
  prisma: PrismaClient = getPrismaClient(),
): Promise<KnowledgeCounts> {
  const grouped = await prisma.knowledgeItem.groupBy({
    by: ["type"],
    where: { projectId },
    _count: { _all: true },
  });

  const counts: KnowledgeCounts = {
    total: 0,
    learning: 0,
    concept: 0,
    bug: 0,
    prompt: 0,
  };

  for (const entry of grouped) {
    const parsed = knowledgeItemType.safeParse(entry.type);

    if (!parsed.success) {
      continue;
    }

    counts[parsed.data] = entry._count._all;
    counts.total += entry._count._all;
  }

  return counts;
}

async function countArtifactsByOwner(
  ownerIds: string[],
  prisma: PrismaClient,
): Promise<Map<string, number>> {
  if (ownerIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.artifact.groupBy({
    by: ["ownerId"],
    where: {
      ownerType: "knowledge_item",
      ownerId: { in: ownerIds },
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.ownerId, row._count._all]));
}

function parseKnowledgeType(value: string): KnowledgeItemType {
  return knowledgeItemType.parse(value);
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

function buildExcerpt(bodyMd: string): string {
  const firstLine = bodyMd
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";

  if (firstLine.length <= 120) {
    return firstLine;
  }

  return `${firstLine.slice(0, 120).trimEnd()}…`;
}
