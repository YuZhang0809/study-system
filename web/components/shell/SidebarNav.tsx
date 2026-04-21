"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { surfaces, surfaceForPath } from "@/lib/surfaces";

export function SidebarNav() {
  const pathname = usePathname();
  const active = surfaceForPath(pathname)?.id;

  return (
    <ul className="nav">
      {surfaces.map((surface) => (
        <li key={surface.id}>
          <Link
            href={surface.path}
            className="nav-item"
            aria-current={active === surface.id ? "true" : undefined}
          >
            <Icon name={surface.icon} />
            <span>{surface.label}</span>
            <span className="kbd">{surface.shortcut}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
