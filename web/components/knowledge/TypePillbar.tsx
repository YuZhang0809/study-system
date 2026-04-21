import type { KnowledgeCounts, KnowledgeFilterType } from "@/lib/knowledge/queries";

interface TypePillbarProps {
  projectId: string;
  activeType: KnowledgeFilterType;
  countsByType: KnowledgeCounts;
}

const PILL_ORDER: KnowledgeFilterType[] = ["all", "learning", "concept", "bug", "prompt"];

export function TypePillbar({ projectId, activeType, countsByType }: TypePillbarProps) {
  return (
    <nav className="pillbar knowledge-pillbar" aria-label="知识类型筛选" role="tablist">
      {PILL_ORDER.map((type) => {
        const params = new URLSearchParams({
          project: projectId,
          type,
        });

        return (
          <a
            key={type}
            href={`/knowledge?${params.toString()}`}
            className="pill"
            role="tab"
            aria-selected={activeType === type}
          >
            <span className="caps">{type}</span>
            <span className="n num">{type === "all" ? countsByType.total : countsByType[type]}</span>
          </a>
        );
      })}
    </nav>
  );
}
