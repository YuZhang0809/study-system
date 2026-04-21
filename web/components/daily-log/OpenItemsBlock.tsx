import { formatMonthDay } from "@/lib/daily-log/presentation";
import type { CappedListResult, OpenItemRecord } from "@/lib/daily-log/queries";
import { AddOpenItemRow } from "./AddOpenItemRow";
import { CloseOpenItemButton } from "./CloseOpenItemButton";

interface OpenItemsBlockProps {
  projectId: string;
  openItems: CappedListResult<OpenItemRecord>;
}

export function OpenItemsBlock({ projectId, openItems }: OpenItemsBlockProps) {
  return (
    <div className="daily-block-list">
      {openItems.items.length === 0 ? <p className="today-empty">无未清账</p> : null}

      {openItems.items.map((item) => (
        <div key={item.id} className="daily-block-row">
          <div className="daily-block-main">
            <p className="daily-block-text serif">{item.text}</p>
            <span className="mono t-xs ink-3">{formatMonthDay(item.openedAt)}</span>
          </div>
          <CloseOpenItemButton id={item.id} />
        </div>
      ))}

      <AddOpenItemRow projectId={projectId} />

      {openItems.truncated ? (
        <p className="daily-block-footer">仅显示 50 条 · 先关几条再加</p>
      ) : null}
    </div>
  );
}
