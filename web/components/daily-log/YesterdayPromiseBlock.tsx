import { formatIsoDate } from "@/lib/today/driving-seat";

interface YesterdayPromiseBlockProps {
  text: string | null;
  yesterday: Date;
}

export function YesterdayPromiseBlock({ text, yesterday }: YesterdayPromiseBlockProps) {
  const trimmedText = text?.trim() ?? "";

  if (!trimmedText) {
    return <p className="today-empty">昨日未留下第一件事</p>;
  }

  return (
    <div className="daily-promise-row">
      <span className="check" aria-hidden="true" />
      <div className="daily-promise-copy">
        <p className="daily-promise-text serif">“{trimmedText}”</p>
        <p className="daily-promise-meta">来自 昨日 daily_log · {formatIsoDate(yesterday)}</p>
      </div>
      <div className="daily-promise-label">
        <span className="mono t-xs">未兑现</span>
      </div>
    </div>
  );
}
