import type { TimelineCell } from "@/lib/today/timeline";
import { formatIsoDate } from "@/lib/today/driving-seat";

interface TimelineProps {
  cells: TimelineCell[];
  showBand: boolean;
}

export function Timeline({ cells, showBand }: TimelineProps) {
  if (!showBand) {
    return <div className="today-timeline-marker mono">今日</div>;
  }

  return (
    <ol className="today-timeline-band" aria-label="项目时间带">
      {cells.map((cell) => {
        const isoDate = formatIsoDate(cell.date);

        return (
          <li
            key={isoDate}
            className={`today-timeline-cell${cell.isToday ? " is-today" : ""}`}
            aria-current={cell.isToday ? "date" : undefined}
            aria-label={isoDate}
          >
            {cell.isPhaseBoundary ? <span className="today-timeline-boundary" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
