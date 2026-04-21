import { formatMonthDay } from "@/lib/daily-log/presentation";
import type { BlockerRecord, CappedListResult } from "@/lib/daily-log/queries";
import { AddBlockerRow } from "./AddBlockerRow";
import { ResolveBlockerButton } from "./ResolveBlockerButton";

interface BlockersBlockProps {
  projectId: string;
  blockers: CappedListResult<BlockerRecord>;
}

export function BlockersBlock({ projectId, blockers }: BlockersBlockProps) {
  return (
    <div className="daily-block-list">
      {blockers.items.length === 0 ? <p className="today-empty">无阻塞</p> : null}

      {blockers.items.map((blocker) => (
        <div key={blocker.id} className="daily-block-row">
          <div className="daily-block-main">
            <p className="daily-block-text serif">{blocker.text}</p>
            <span className="mono t-xs ink-3">{formatMonthDay(blocker.openedAt)}</span>
          </div>
          <ResolveBlockerButton id={blocker.id} />
        </div>
      ))}

      <AddBlockerRow projectId={projectId} />

      {blockers.truncated ? (
        <p className="daily-block-footer">仅显示 50 条 · 先关几条再加</p>
      ) : null}
    </div>
  );
}
