export interface DrivingSeatProject {
  name: string;
  startDate: Date;
  endDate: Date | null;
  hasPlanStructure: string;
}

export interface DrivingSeatSegment {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface DrivingSeatState {
  sentence: string;
  activeSegment: DrivingSeatSegment | null;
  todayIndex: number | null;
  totalDays: number | null;
  daysToPhaseEnd: number | null;
  daysSinceStart: number | null;
  daysUntilStart: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDayUtc(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function differenceInDaysUtc(left: Date, right: Date): number {
  return Math.round((startOfDayUtc(left).getTime() - startOfDayUtc(right).getTime()) / DAY_MS);
}

export function sameDayUtc(left: Date, right: Date): boolean {
  return startOfDayUtc(left).getTime() === startOfDayUtc(right).getTime();
}

export function formatIsoDate(value: Date): string {
  return startOfDayUtc(value).toISOString().slice(0, 10);
}

export function getDayIndex(startDate: Date, today: Date): number {
  return differenceInDaysUtc(today, startDate) + 1;
}

export function getTotalProjectDays(project: Pick<DrivingSeatProject, "startDate" | "endDate">): number | null {
  if (!project.endDate) {
    return null;
  }

  return differenceInDaysUtc(project.endDate, project.startDate) + 1;
}

export function getDaysSinceStart(startDate: Date, today: Date): number {
  return getDayIndex(startDate, today);
}

export function getDaysToPhaseEnd(endDate: Date, today: Date): number {
  return differenceInDaysUtc(endDate, today);
}

export function findActiveSegment(
  segments: readonly DrivingSeatSegment[],
  today: Date,
): DrivingSeatSegment | null {
  if (segments.length === 0) {
    return null;
  }

  const todayStamp = startOfDayUtc(today).getTime();
  const sorted = [...segments].sort((left, right) => left.startDate.getTime() - right.startDate.getTime());

  for (const segment of sorted) {
    const start = startOfDayUtc(segment.startDate).getTime();
    const end = startOfDayUtc(segment.endDate).getTime();

    if (todayStamp >= start && todayStamp <= end) {
      return segment;
    }
  }

  if (todayStamp < startOfDayUtc(sorted[0].startDate).getTime()) {
    return sorted[0];
  }

  return sorted[sorted.length - 1];
}

export function buildDrivingSeatState(
  project: DrivingSeatProject,
  segments: readonly DrivingSeatSegment[],
  today: Date,
): DrivingSeatState {
  const daysUntilStart = differenceInDaysUtc(project.startDate, today);

  if (daysUntilStart > 0) {
    return {
      sentence: `${project.name} · 尚未开始（${daysUntilStart} 天）`,
      activeSegment: findActiveSegment(segments, today),
      todayIndex: null,
      totalDays: getTotalProjectDays(project),
      daysToPhaseEnd: null,
      daysSinceStart: null,
      daysUntilStart,
    };
  }

  const activeSegment = findActiveSegment(segments, today);

  if (project.hasPlanStructure === "open") {
    const daysSinceStart = getDaysSinceStart(project.startDate, today);
    return {
      sentence: `你现在在 ${project.name} · 累计第 ${daysSinceStart} 天`,
      activeSegment,
      todayIndex: null,
      totalDays: getTotalProjectDays(project),
      daysToPhaseEnd: null,
      daysSinceStart,
      daysUntilStart: null,
    };
  }

  if (!activeSegment) {
    const todayIndex = getDayIndex(project.startDate, today);
    const totalDays = getTotalProjectDays(project);
    return {
      sentence: `你现在在 ${project.name} · 第 ${todayIndex} 天${totalDays ? ` / 共 ${totalDays} 天` : ""}`,
      activeSegment: null,
      todayIndex,
      totalDays,
      daysToPhaseEnd: null,
      daysSinceStart: todayIndex,
      daysUntilStart: null,
    };
  }

  if (project.hasPlanStructure === "segments_only") {
    const daysToPhaseEnd = getDaysToPhaseEnd(activeSegment.endDate, today);
    return {
      sentence: `你现在在 ${activeSegment.name} · 距阶段结束还剩 ${daysToPhaseEnd} 天`,
      activeSegment,
      todayIndex: null,
      totalDays: getTotalProjectDays(project),
      daysToPhaseEnd,
      daysSinceStart: getDaysSinceStart(project.startDate, today),
      daysUntilStart: null,
    };
  }

  const todayIndex = getDayIndex(project.startDate, today);
  const totalDays = getTotalProjectDays(project);

  return {
    sentence: `你现在在 ${activeSegment.name} · 第 ${todayIndex} 天 / 共 ${totalDays ?? todayIndex} 天`,
    activeSegment,
    todayIndex,
    totalDays,
    daysToPhaseEnd: getDaysToPhaseEnd(activeSegment.endDate, today),
    daysSinceStart: getDaysSinceStart(project.startDate, today),
    daysUntilStart: null,
  };
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const baseProject: DrivingSeatProject = {
    name: "Agentic 90d",
    startDate: new Date("2026-05-03T00:00:00.000Z"),
    endDate: new Date("2026-05-07T00:00:00.000Z"),
    hasPlanStructure: "full",
  };

  const fullSegments: DrivingSeatSegment[] = [
    {
      id: "seg-1",
      name: "Phase 1 - Foundations",
      startDate: new Date("2026-05-03T00:00:00.000Z"),
      endDate: new Date("2026-05-04T00:00:00.000Z"),
    },
    {
      id: "seg-2",
      name: "Phase 2 - Build",
      startDate: new Date("2026-05-05T00:00:00.000Z"),
      endDate: new Date("2026-05-07T00:00:00.000Z"),
    },
  ];

  describe("driving-seat helpers", () => {
    it("computes the day index from the project start date", () => {
      expect(getDayIndex(baseProject.startDate, new Date("2026-05-05T00:00:00.000Z"))).toBe(3);
    });

    it("formats the full-plan sentence when today is inside the project window", () => {
      const state = buildDrivingSeatState(
        baseProject,
        fullSegments,
        new Date("2026-05-05T00:00:00.000Z"),
      );

      expect(state.sentence).toBe("你现在在 Phase 2 - Build · 第 3 天 / 共 5 天");
      expect(state.todayIndex).toBe(3);
      expect(state.totalDays).toBe(5);
      expect(state.activeSegment?.id).toBe("seg-2");
    });

    it("formats the segments-only sentence with days left in the phase", () => {
      const state = buildDrivingSeatState(
        { ...baseProject, hasPlanStructure: "segments_only" },
        fullSegments,
        new Date("2026-05-05T00:00:00.000Z"),
      );

      expect(state.sentence).toBe("你现在在 Phase 2 - Build · 距阶段结束还剩 2 天");
      expect(state.daysToPhaseEnd).toBe(2);
    });

    it("formats the open-plan sentence from days since start", () => {
      const state = buildDrivingSeatState(
        { ...baseProject, name: "Open Project", endDate: null, hasPlanStructure: "open" },
        [],
        new Date("2026-05-05T00:00:00.000Z"),
      );

      expect(state.sentence).toBe("你现在在 Open Project · 累计第 3 天");
      expect(state.daysSinceStart).toBe(3);
    });

    it("formats the pre-start sentence before the project begins", () => {
      const state = buildDrivingSeatState(
        baseProject,
        fullSegments,
        new Date("2026-05-01T00:00:00.000Z"),
      );

      expect(state.sentence).toBe("Agentic 90d · 尚未开始（2 天）");
      expect(state.daysUntilStart).toBe(2);
      expect(state.activeSegment?.id).toBe("seg-1");
    });

    it("uses the last segment when today is after the project end", () => {
      const state = buildDrivingSeatState(
        baseProject,
        fullSegments,
        new Date("2026-05-09T00:00:00.000Z"),
      );

      expect(state.activeSegment?.id).toBe("seg-2");
      expect(state.sentence).toBe("你现在在 Phase 2 - Build · 第 7 天 / 共 5 天");
      expect(state.daysToPhaseEnd).toBe(-2);
    });

    it("finds the first segment when today is before all segment ranges", () => {
      expect(findActiveSegment(fullSegments, new Date("2026-05-01T00:00:00.000Z"))?.id).toBe("seg-1");
    });

    it("formats dates as ISO day strings", () => {
      expect(formatIsoDate(new Date("2026-05-05T08:30:00.000Z"))).toBe("2026-05-05");
      expect(sameDayUtc(new Date("2026-05-05T00:00:00.000Z"), new Date("2026-05-05T23:59:59.000Z"))).toBe(true);
    });
  });
}
