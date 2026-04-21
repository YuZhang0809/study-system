import { Block } from "@/components/today/Block";
import { DrivingSeat } from "@/components/today/DrivingSeat";
import { Fact } from "@/components/today/Fact";
import { FactStrip } from "@/components/today/FactStrip";
import { Timeline } from "@/components/today/Timeline";
import { resolveActiveProject } from "@/lib/today/active-project";
import { buildDrivingSeatState, formatIsoDate, getDaysToPhaseEnd, startOfDayUtc } from "@/lib/today/driving-seat";
import { buildTimelineState } from "@/lib/today/timeline";

interface TodayPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const requestedProjectId = getSearchParam(await searchParams, "project");
  const project = await resolveActiveProject(requestedProjectId);

  if (!project) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">今日</h1>
        </div>
        <p className="empty">还没有项目。跑 <code>npm run seed</code> 导入一个计划。</p>
      </div>
    );
  }

  const today = startOfDayUtc(new Date());
  const drivingSeat = buildDrivingSeatState(project, project.segments, today);
  const timeline = buildTimelineState(project, project.segments, today);
  const segmentFactLabel = drivingSeat.activeSegment
    ? `${drivingSeat.activeSegment.name} 还剩`
    : "当前阶段";
  const segmentFactValue = drivingSeat.activeSegment
    ? `${getDaysToPhaseEnd(drivingSeat.activeSegment.endDate, today)} 天`
    : "—";
  const todayLabel = `今日 ${formatIsoDate(today)}`;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">今日</h1>
        <span className="page-sub num">{formatIsoDate(today)}</span>
      </div>

      <div className="today-shell">
        <section className="card today-overview">
          <DrivingSeat sentence={drivingSeat.sentence} />
          <Timeline cells={timeline.cells} showBand={timeline.showBand} />
          <FactStrip>
            <Fact label="累计 commits" value="—" />
            <Fact label="连续写 log" value="—" />
            <Fact label={segmentFactLabel} value={segmentFactValue} />
            <Fact label="阶段统计" value="—" />
          </FactStrip>
        </section>

        <div className="today-ledger">
          <div className="today-column">
            <Block heading="昨日之承诺 · 未结清">
              <p className="today-empty">尚未记录 — daily-log-flow 落地后会显示昨日留下的第一件事</p>
            </Block>
            <Block heading={todayLabel} ruled>
              <p className="today-empty">{todayLabel} — 未排入计划</p>
            </Block>
          </div>

          <div className="today-column">
            <Block heading="最近动静">
              <p className="today-empty">尚未记录 — knowledge-capture-inline 落地后会显示最近沉淀</p>
            </Block>
          </div>

          <div className="today-column">
            <Block heading="未清账">
              <p className="today-empty">尚未记录 — daily-log-flow 落地后会挂出未结清条目</p>
            </Block>
            <Block heading="阻塞">
              <p className="today-empty">尚未记录 — 阻塞会在 daily-log-flow / 手动记录时出现</p>
            </Block>
          </div>
        </div>
      </div>
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
