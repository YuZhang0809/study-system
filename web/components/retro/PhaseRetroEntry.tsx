"use client";

import { PhaseRetroList } from "@/components/retro/PhaseRetroList";
import { PhaseRetroWizard } from "@/components/retro/PhaseRetroWizard";
import type { RetroMetricsInput, RetroSelfScoresInput } from "@/lib/schemas/retro";
import type { RetroEligibilityReason, RetroSegmentLike } from "@/lib/retro/presentation";
import type { RetroRecord } from "@/lib/retro/queries";

interface PhaseRetroEntryProps {
  projectId: string;
  eligibleSegment: RetroSegmentLike | null;
  eligibleReason: RetroEligibilityReason | null;
  metrics: RetroMetricsInput | null;
  previousScores: RetroSelfScoresInput | null;
  retros: RetroRecord[];
  isWizardOpen: boolean;
  listHref: string;
}

export function PhaseRetroEntry({
  projectId,
  eligibleSegment,
  eligibleReason,
  metrics,
  previousScores,
  retros,
  isWizardOpen,
  listHref,
}: PhaseRetroEntryProps) {
  if (isWizardOpen && eligibleSegment && metrics) {
    return (
      <PhaseRetroWizard
        projectId={projectId}
        segment={eligibleSegment}
        metrics={metrics}
        previousScores={previousScores}
        onExit={() => {
          window.location.href = listHref;
        }}
      />
    );
  }

  return (
    <PhaseRetroList
      retros={retros}
      eligibleSegment={eligibleSegment}
      eligibleReason={eligibleReason}
    />
  );
}
