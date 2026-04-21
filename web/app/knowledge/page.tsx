import { KnowledgeList } from "@/components/knowledge/KnowledgeList";
import { SearchBox } from "@/components/knowledge/SearchBox";
import { TypePillbar } from "@/components/knowledge/TypePillbar";
import { NewButtonRow } from "./_NewButtonRow";
import { countByType, listKnowledgeForProject, type KnowledgeFilterType } from "@/lib/knowledge/queries";
import { resolveActiveProject } from "@/lib/today/active-project";

interface KnowledgePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const KNOWLEDGE_LIST_BODY_ID = "knowledge-list-body";
const KNOWLEDGE_EMPTY_ROW_ID = "knowledge-empty-row";

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedProjectId = getSearchParam(resolvedSearchParams, "project");
  const requestedType = getRequestedType(getSearchParam(resolvedSearchParams, "type"));
  const project = await resolveActiveProject(requestedProjectId);

  if (!project) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">知识库</h1>
        </div>
        <p className="empty">
          还没有项目。跑 <code>npm run seed</code> 导入一个计划。
        </p>
      </div>
    );
  }

  const [countsByType, listResult] = await Promise.all([
    countByType(project.id),
    listKnowledgeForProject(project.id, requestedType),
  ]);

  return (
    <div className="page">
      <div className="page-head knowledge-page-head">
        <div className="knowledge-page-meta">
          <h1 className="page-title">知识库</h1>
          <span className="page-sub num">
            {countsByType.total} 条 · {countsByType.learning} 心得 · {countsByType.concept} 概念 · {countsByType.bug} 缺陷 ·{" "}
            {countsByType.prompt} 提示词
          </span>
        </div>
        <NewButtonRow projectId={project.id} />
      </div>

      <div className="knowledge-filter-row">
        <TypePillbar projectId={project.id} activeType={requestedType} countsByType={countsByType} />
        <SearchBox tableBodyId={KNOWLEDGE_LIST_BODY_ID} emptyRowId={KNOWLEDGE_EMPTY_ROW_ID} />
      </div>

      <KnowledgeList
        items={listResult.items}
        countsByType={countsByType}
        activeType={requestedType}
        tableBodyId={KNOWLEDGE_LIST_BODY_ID}
        emptyRowId={KNOWLEDGE_EMPTY_ROW_ID}
        truncated={listResult.truncated}
      />
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

function getRequestedType(value: string | undefined): KnowledgeFilterType {
  switch (value) {
    case "learning":
    case "concept":
    case "bug":
    case "prompt":
      return value;
    default:
      return "all";
  }
}
