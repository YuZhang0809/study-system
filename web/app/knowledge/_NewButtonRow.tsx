"use client";

import { useState } from "react";
import { Icon } from "@/components/shell/Icon";
import { InlineCompose } from "@/components/knowledge/InlineCompose";
import type { KnowledgeItemType } from "@/lib/schemas/enums";

interface NewButtonRowProps {
  projectId: string;
}

const BUTTONS: { type: KnowledgeItemType; primary?: boolean }[] = [
  { type: "learning" },
  { type: "concept" },
  { type: "bug" },
  { type: "prompt", primary: true },
];

export function NewButtonRow({ projectId }: NewButtonRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftType, setDraftType] = useState<KnowledgeItemType>("learning");

  function open(type: KnowledgeItemType) {
    setDraftType(type);
    setIsOpen(true);
  }

  return (
    <div className="knowledge-new-area">
      <div className="knowledge-new-row">
        {BUTTONS.map((button) => (
          <button
            key={button.type}
            type="button"
            className={`btn${button.primary ? " btn--primary" : ""}`}
            onClick={() => open(button.type)}
          >
            <Icon name={button.type} size={11} />
            <span>+{button.type}</span>
          </button>
        ))}
      </div>

      {isOpen ? (
        <InlineCompose
          projectId={projectId}
          type={draftType}
          onTypeChange={setDraftType}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </div>
  );
}
