"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { surfaces, surfaceForPath } from "@/lib/surfaces";

export function Sidebar() {
  const pathname = usePathname();
  const active = surfaceForPath(pathname)?.id;

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">SS</span>
        <span className="brand-name">study-system</span>
      </div>

      <div>
        <div className="section-label">项目</div>
        <ul className="proj-list">
          <li className="proj-item" aria-current={false}>
            <span className="empty">还没有项目</span>
          </li>
        </ul>
      </div>

      <div>
        <div className="section-label">导航</div>
        <ul className="nav">
          {surfaces.map((s) => (
            <li key={s.id}>
              <Link
                href={s.path}
                className="nav-item"
                aria-current={active === s.id ? "true" : undefined}
              >
                <Icon name={s.icon} />
                <span>{s.label}</span>
                <span className="kbd">{s.shortcut}</span>
              </Link>
            </li>
          ))}
        </ul>
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
