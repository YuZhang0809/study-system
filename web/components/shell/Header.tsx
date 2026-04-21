"use client";

import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { surfaceForPath } from "@/lib/surfaces";

export function Header() {
  const pathname = usePathname();
  const surface = surfaceForPath(pathname);

  return (
    <header className="app-header">
      <div className="crumbs">
        <span className="crumb-cur">{surface?.label ?? ""}</span>
      </div>
      <div className="header-right">
        <button className="header-btn" disabled aria-disabled="true">
          <Icon name="search" size={12} />
          <span>搜索</span>
          <span className="kbd">/</span>
        </button>
        <button className="header-btn" disabled aria-disabled="true">
          <Icon name="plus" size={12} />
          <span>新建</span>
          <span className="kbd">N</span>
        </button>
      </div>
    </header>
  );
}
