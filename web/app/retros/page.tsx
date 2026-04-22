import { PhaseRetroEntry } from "@/components/retro/PhaseRetroEntry";
import { WeeklyLogCard } from "@/components/weekly/WeeklyLogCard";
import { WeeklyReviewEntry } from "@/components/weekly/WeeklyReviewEntry";
import { computeRetroMetrics } from "@/lib/retro/metrics";
import { pickPreviousRetro, selectEligibleSegment, type RetroEligibilityReason } from "@/lib/retro/presentation";
import { listRetrosForProject } from "@/lib/retro/queries";
import { getPrismaClient } from "@/lib/prisma";
import { resolveActiveProject } from "@/lib/today/active-project";
import { startOfLocalDay } from "@/lib/today/driving-seat";
import { getPreviousWeekLog, getWeeklyLog, listWeeklyLogs } from "@/lib/weekly-log/queries";
import { isoWeekEnd, isoWeekStart } from "@/lib/weekly-log/presentation";

interface RetrosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type RetrosTab = "phase" | "weekly";

export default async function RetrosPage({ searchParams }: RetrosPageProps) {
  const params = await searchParams;
  const requestedProjectId = getSearchParam(params, "project");
  const requestedTab = getSearchParam(params, "tab");
  const requestedWizard = getSearchParam(params, "wizard");
  const activeTab: RetrosTab = requestedTab === "weekly" ? "weekly" : "phase";
  const project = await resolveActiveProject(requestedProjectId);

  if (!project) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">复盘</h1>
        </div>
        <p className="empty">还没有项目 · 跑 npm run seed 导入一个计划</p>
      </div>
    );
  }

  const today = startOfLocalDay(new Date());
  const thisWeekStart = isoWeekStart(today);
  const thisWeekEnd = isoWeekEnd(thisWeekStart);
  const prisma = getPrismaClient();
  const [retros, existingLog, previousLog, weeklyLogs] = await Promise.all([
    listRetrosForProject(project.id, prisma),
    getWeeklyLog(project.id, thisWeekStart, prisma),
    getPreviousWeekLog(project.id, thisWeekStart, prisma),
    listWeeklyLogs(project.id, prisma),
  ]);

  const eligibleResult = selectEligibleSegment(project, project.segments, retros, today);
  const eligibleSegment = eligibleResult.segment;
  const eligibleReason = eligibleResult.reason;
  const previousRetro = eligibleSegment ? pickPreviousRetro(eligibleSegment, project.segments, retros) : null;
  const previousScores = previousRetro?.selfScores ?? null;
  const metrics = eligibleSegment ? await computeRetroMetrics(project.id, eligibleSegment, prisma) : null;
  const phaseRetroCount = retros.length;
  const weeklyCount = weeklyLogs.length;
  const phaseListHref = buildRetrosHref(project.id, "phase");
  const phaseWizardHref = buildRetrosHref(project.id, "phase", { wizard: true });
  const weeklyHref = buildRetrosHref(project.id, "weekly");
  const isWizardOpen = activeTab === "phase" && requestedWizard === "1";

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">复盘</h1>
        <span className="page-sub num">
          {phaseRetroCount} 份阶段复盘 · {weeklyCount} 份周记
        </span>
        {activeTab === "phase" ? (
          <div className="page-head-actions">
            <a className="btn" href={weeklyHref}>
              <span>周记 · {weeklyCount}</span>
            </a>
            {eligibleSegment && metrics ? (
              <a className="btn btn--amber" href={phaseWizardHref}>
                <span>阶段复盘</span>
                <span className="kbd">⌘↵</span>
              </a>
            ) : (
              <button
                type="button"
                className="btn btn--amber"
                disabled
                title={getPhaseDisabledCopy(eligibleReason)}
              >
                <span>阶段复盘</span>
                <span className="kbd">⌘↵</span>
              </button>
            )}
          </div>
        ) : (
          <WeeklyReviewEntry
            projectId={project.id}
            thisWeekStart={thisWeekStart}
            thisWeekEnd={thisWeekEnd}
            existingLog={existingLog ? { reflections: existingLog.reflections, selfScores: existingLog.selfScores } : null}
            previousWeekQ6={previousLog?.reflections.q6 ?? null}
            phaseHref={phaseListHref}
            phaseCount={phaseRetroCount}
          />
        )}
      </div>

      <div className="pillbar" role="tablist" aria-label="复盘视图">
        <a
          className="pill"
          role="tab"
          aria-selected={activeTab === "phase"}
          href={phaseListHref}
        >
          <span className="caps">阶段复盘</span>
          <span className="n num">{phaseRetroCount}</span>
        </a>
        <a
          className="pill"
          role="tab"
          aria-selected={activeTab === "weekly"}
          href={weeklyHref}
        >
          <span className="caps">周记</span>
          <span className="n num">{weeklyCount}</span>
        </a>
      </div>

      {activeTab === "phase" ? (
        <PhaseRetroEntry
          eligibleSegment={eligibleSegment}
          eligibleReason={eligibleReason}
          metrics={metrics}
          previousScores={previousScores}
          retros={retros}
          isWizardOpen={isWizardOpen}
          listHref={phaseListHref}
        />
      ) : weeklyLogs.length === 0 ? (
        <p className="empty">还没写过周记 · 右上 本周复盘 开始</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {weeklyLogs.map((log) => (
            <WeeklyLogCard key={log.id} log={log} projectStartDate={project.startDate} />
          ))}
        </div>
      )}
    </div>
  );
}

function getSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function buildRetrosHref(
  projectId: string,
  tab: RetrosTab,
  options: { wizard?: boolean } = {},
): string {
  const search = new URLSearchParams({
    project: projectId,
    tab,
  });

  if (options.wizard) {
    search.set("wizard", "1");
  }

  return `/retros?${search.toString()}`;
}

function getPhaseDisabledCopy(reason: RetroEligibilityReason | null): string {
  if (reason === "all_retroed") {
    return "这一阶段已复盘 · 下一阶段结束再来";
  }

  return "这阶段还没收尾 · 先把日志写完";
}
