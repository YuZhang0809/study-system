import { Icon } from "@/components/shell/Icon";
import type { KnowledgeItemType } from "@/lib/schemas/enums";

const TYPE_META: Record<KnowledgeItemType, { label: string; icon: "learning" | "concept" | "bug" | "prompt" }> = {
  learning: { label: "LEARNING", icon: "learning" },
  concept: { label: "CONCEPT", icon: "concept" },
  bug: { label: "BUG", icon: "bug" },
  prompt: { label: "PROMPT", icon: "prompt" },
};

interface TypeTagProps {
  type: KnowledgeItemType;
}

export function TypeTag({ type }: TypeTagProps) {
  const meta = TYPE_META[type];

  return (
    <span className="chip knowledge-type-tag">
      <Icon name={meta.icon} size={11} />
      <span>{meta.label}</span>
    </span>
  );
}
