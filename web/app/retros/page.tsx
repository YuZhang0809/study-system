import { WeeklyLogCard } from "@/components/weekly/WeeklyLogCard";
import { WeeklyReviewEntry } from "@/components/weekly/WeeklyReviewEntry";
import { getPrismaClient } from "@/lib/prisma";
import { resolveActiveProject } from "@/lib/today/active-project";
import { startOfLocalDay } from "@/lib/today/driving-seat";
import { getPreviousWeekLog, getWeeklyLog, listWeeklyLogs } from "@/lib/weekly-log/queries";
import { isoWeekEnd, isoWeekStart } from "@/lib/weekly-log/presentation";

interface RetrosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type RetrosTab = "weekly" | "phase";

export default async function RetrosPage({ searchParams }: RetrosPageProps) {
  const params = await searchParams;
  const requestedProjectId = getSearchParam(params, "project");
  const requestedTab = getSearchParam(params, "tab");
  const activeTab = requestedTab === "phase" ? "phase" : "weekly";
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
  const [existingLog, previousLog, weeklyLogs] = await Promise.all([
    getWeeklyLog(project.id, thisWeekStart, prisma),
    getPreviousWeekLog(project.id, thisWeekStart, prisma),
    listWeeklyLogs(project.id, prisma),
  ]);

  const phaseRetroCount = 0;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">复盘</h1>
        <span className="page-sub num">
          {phaseRetroCount} 份阶段复盘 · {weeklyLogs.length} 份周记
        </span>
        <WeeklyReviewEntry
          projectId={project.id}
          thisWeekStart={thisWeekStart}
          thisWeekEnd={thisWeekEnd}
          existingLog={existingLog ? { reflections: existingLog.reflections, selfScores: existingLog.selfScores } : null}
          previousWeekQ6={previousLog?.reflections.q6 ?? null}
        />
      </div>

      <div className="pillbar" role="tablist" aria-label="复盘视图">
        <a
          className="pill"
          role="tab"
          aria-selected={activeTab === "phase"}
          href={buildRetrosHref(project.id, "phase")}
        >
          <span className="caps">阶段复盘</span>
          <span className="n num">{phaseRetroCount}</span>
        </a>
        <a
          className="pill"
          role="tab"
          aria-selected={activeTab === "weekly"}
          href={buildRetrosHref(project.id, "weekly")}
        >
          <span className="caps">周记</span>
          <span className="n num">{weeklyLogs.length}</span>
        </a>
      </div>

      {activeTab === "phase" ? (
        <div className="card" style={{ padding: "28px 20px", textAlign: "center" }}>
          <span className="mono t-xs caps ink-4">阶段复盘 · 下一刀做</span>
        </div>
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

function buildRetrosHref(projectId: string, tab: RetrosTab): string {
  const search = new URLSearchParams({
    project: projectId,
    tab,
  });

  return `/retros?${search.toString()}`;
}
