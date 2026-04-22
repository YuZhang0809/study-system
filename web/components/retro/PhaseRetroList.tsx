import { PhaseRetroCard } from "@/components/retro/PhaseRetroCard";
import type { RetroEligibilityReason, RetroSegmentLike } from "@/lib/retro/presentation";
import type { RetroRecord } from "@/lib/retro/queries";

interface PhaseRetroListProps {
  retros: RetroRecord[];
  eligibleSegment: RetroSegmentLike | null;
  eligibleReason: RetroEligibilityReason | null;
}

export function PhaseRetroList({ retros, eligibleSegment, eligibleReason }: PhaseRetroListProps) {
  if (retros.length === 0) {
    if (eligibleSegment) {
      return <p className="empty">{formatSegmentLabel(eligibleSegment)} 已收尾 · 点 阶段复盘 开始</p>;
    }

    if (eligibleReason === "none_finished") {
      return <p className="empty">还没有阶段 · 先把计划跑到段终点再回来</p>;
    }

    return <p className="empty">还没有阶段 · 先把计划跑到段终点再回来</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {eligibleSegment ? <p className="empty">下一段 · {formatSegmentLabel(eligibleSegment)} · 点 阶段复盘 开始</p> : null}
      {retros.map((retro) => (
        <PhaseRetroCard key={retro.id} retro={retro} />
      ))}
    </div>
  );
}

function formatSegmentLabel(segment: Pick<RetroSegmentLike, "order" | "name">): string {
  return `第 ${segment.order} 阶段 — ${segment.name}`;
}
