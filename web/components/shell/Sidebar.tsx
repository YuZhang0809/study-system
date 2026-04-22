import { Suspense } from "react";
import { listSidebarProjects } from "@/lib/today/active-project";
import { ProjectListActive } from "./ProjectListActive";
import { SidebarNav } from "./SidebarNav";

export async function Sidebar() {
  const projects = await listSidebarProjects();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">SS</span>
        <span className="brand-name">study-system</span>
      </div>

      <div>
        <div className="section-label">项目</div>
        {projects.length === 0 ? (
          <ul className="proj-list">
            <li>
              <span className="proj-item">
                <span className="empty">还没有项目</span>
              </span>
            </li>
          </ul>
        ) : (
          <Suspense fallback={<ProjectListFallback projects={projects} />}>
            <ProjectListActive projects={projects} />
          </Suspense>
        )}
      </div>

      <div>
        <div className="section-label">导航</div>
        <SidebarNav />
      </div>

      <div className="mt-auto px-4 pb-3 pt-3 rule-t">
        <div className="font-mono text-xs text-ink-3 leading-relaxed">
          <div>本地 · SQLite</div>
          <div>尚未配置备份</div>
          <div>DB 0KB</div>
        </div>
      </div>
    </aside>
  );
}

function ProjectListFallback({
  projects,
}: {
  projects: Awaited<ReturnType<typeof listSidebarProjects>>;
}) {
  return (
    <ul className="proj-list">
      {projects.map((project) => (
        <li key={project.id}>
          <span className="proj-item">
            <span className="proj-name">{project.name}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
