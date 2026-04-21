import { daysOpen, formatMonthDay } from "@/lib/daily-log/presentation";
import type { CappedListResult, OpenItemRecord } from "@/lib/daily-log/queries";
import { AddOpenItemRow } from "./AddOpenItemRow";
import { CloseOpenItemButton } from "./CloseOpenItemButton";

interface OpenItemsBlockProps {
  projectId: string;
  openItems: CappedListResult<OpenItemRecord>;
  today: Date;
}

export function OpenItemsBlock({ projectId, openItems, today }: OpenItemsBlockProps) {
  return (
    <div className="daily-block-list">
      {openItems.items.length === 0 ? <p className="today-empty">无未清账</p> : null}

      {openItems.items.map((item) => {
        const overdueDays = daysOpen(item.openedAt, today);

        return (
          <div key={item.id} className="daily-block-row">
            <div className="daily-block-copy">
              <p className="daily-block-text serif">{item.text}</p>
              <div className="daily-block-meta">
                <span className="mono t-xs ink-3">{formatMonthDay(item.openedAt)}</span>
                <span className={`daily-block-badge mono t-xs${overdueDays > 7 ? " is-drift" : ""}`}>
                  +{overdueDays}d
                </span>
              </div>
            </div>
            <CloseOpenItemButton id={item.id} />
          </div>
        );
      })}

      <AddOpenItemRow projectId={projectId} />

      {openItems.truncated ? (
        <p className="daily-block-footer">仅显示 50 条 · 先关几条再加</p>
      ) : null}
    </div>
  );
}
