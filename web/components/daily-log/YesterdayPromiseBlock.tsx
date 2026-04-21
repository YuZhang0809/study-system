import { CarryForwardButton } from "./CarryForwardButton";

interface YesterdayPromiseBlockProps {
  projectId: string;
  text: string | null;
  canCarryForward: boolean;
}

export function YesterdayPromiseBlock({ projectId, text, canCarryForward }: YesterdayPromiseBlockProps) {
  if (!text) {
    return <p className="today-empty">昨日未留下第一件事</p>;
  }

  return (
    <div className="daily-promise-block">
      <p className="daily-promise-text serif">{text}</p>
      {canCarryForward ? (
        <div className="daily-promise-actions">
          <CarryForwardButton projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
}
