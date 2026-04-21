import { TypeTag } from "@/components/knowledge/TypeTag";
import type { RecentKnowledgeItem } from "@/lib/knowledge/queries";
import { relativeDays } from "@/lib/today/relative-days";

interface RecentKnowledgeListProps {
  items: RecentKnowledgeItem[];
  today: Date;
}

export function RecentKnowledgeList({ items, today }: RecentKnowledgeListProps) {
  return (
    <ul className="today-list">
      {items.map((item) => (
        <li key={item.id} className="today-knowledge-row">
          <div className="today-knowledge-main">
            <TypeTag type={item.type} />
            <span className="today-knowledge-title">{item.title}</span>
          </div>
          <span className="today-knowledge-date mono ink-3 num">{relativeDays(item.createdAt, today)}</span>
        </li>
      ))}
    </ul>
  );
}
