"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { SidebarProject } from "@/lib/today/active-project";

interface ProjectListActiveProps {
  projects: SidebarProject[];
}

export function ProjectListActive({ projects }: ProjectListActiveProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("project");
  const activeProjectId = projects.some((project) => project.id === requestedId)
    ? requestedId
    : (projects[0]?.id ?? null);

  return (
    <ul className="proj-list">
      {projects.map((project) => (
        <li key={project.id}>
          <a
            href={buildProjectHref(pathname, searchParams, project.id)}
            className="proj-item"
            aria-current={activeProjectId === project.id ? "page" : undefined}
          >
            <span className="proj-name">{project.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function buildProjectHref(pathname: string, searchParams: ReturnType<typeof useSearchParams>, projectId: string): string {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set("project", projectId);

  const query = nextSearchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
