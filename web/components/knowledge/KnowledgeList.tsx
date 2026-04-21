import type { KnowledgeCounts, KnowledgeFilterType, KnowledgeListItem } from "@/lib/knowledge/queries";
import { TypeTag } from "./TypeTag";

interface KnowledgeListProps {
  items: KnowledgeListItem[];
  countsByType: KnowledgeCounts;
  activeType: KnowledgeFilterType;
  tableBodyId: string;
  emptyRowId: string;
  truncated?: boolean;
}

export function KnowledgeList({
  items,
  countsByType,
  activeType,
  tableBodyId,
  emptyRowId,
  truncated = false,
}: KnowledgeListProps) {
  const emptyByType = activeType === "all" ? countsByType.total === 0 : countsByType[activeType] === 0;
  const showFooter = truncated || (activeType === "all" && countsByType.total > 200);

  return (
    <div>
      <table className="ledger knowledge-ledger">
        <thead>
          <tr>
            <th style={{ width: 92 }}>类型</th>
            <th style={{ width: 80 }}>ID</th>
            <th>标题</th>
            <th style={{ width: 200 }}>标签</th>
            <th style={{ width: 86 }}>更新于</th>
            <th style={{ width: 50, textAlign: "right" }}>产出</th>
            <th style={{ width: 50, textAlign: "right" }}>关联</th>
          </tr>
        </thead>
        <tbody id={tableBodyId}>
          {items.map((item) => (
            <tr
              key={item.id}
              data-knowledge-row="true"
              data-search-text={buildSearchText(item)}
            >
              <td>
                <TypeTag type={item.type} />
              </td>
              <td className="mono ink-3 num">{formatKnowledgeShortId(item.id)}</td>
              <td>
                <div className="serif knowledge-title-cell">{item.title}</div>
                {item.excerpt ? <div className="serif knowledge-excerpt-cell">{item.excerpt}</div> : null}
              </td>
              <td>
                <div className="knowledge-tag-row">
                  {item.tags.map((tag) => (
                    <span key={`${item.id}-${tag}`} className="chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="mono ink-3 num">{formatMonthDay(item.updatedAt)}</td>
              <td className="mono ink-3 num" style={{ textAlign: "right" }}>
                {item.artifactCount > 0 ? item.artifactCount : "—"}
              </td>
              <td className="mono ink-3 num" style={{ textAlign: "right" }}>
                —
              </td>
            </tr>
          ))}
          <tr id={emptyRowId} hidden={!emptyByType} data-knowledge-empty-row="true">
            <td colSpan={7} className="knowledge-empty-row">
              无条目 · 用上面的按钮新建
            </td>
          </tr>
        </tbody>
      </table>

      {showFooter ? <p className="knowledge-list-footer">仅显示最近 200 条，更早的条目请用类型筛选。</p> : null}
    </div>
  );
}

function formatKnowledgeShortId(id: string): string {
  return `k_${id.slice(-4)}`;
}

function formatMonthDay(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

function buildSearchText(item: KnowledgeListItem): string {
  return `${item.title} ${item.tags.join(" ")}`.toLowerCase();
}
