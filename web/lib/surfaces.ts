export type SurfaceId =
  | "today"
  | "plan"
  | "knowledge"
  | "retros"
  | "artifacts"
  | "settings";

export interface Surface {
  id: SurfaceId;
  label: string;
  shortcut: string;
  path: string;
  icon: SurfaceId;
}

export const surfaces: readonly Surface[] = [
  { id: "today",     label: "今日",   shortcut: "1", path: "/today",     icon: "today" },
  { id: "plan",      label: "计划",   shortcut: "2", path: "/plan",      icon: "plan" },
  { id: "knowledge", label: "知识库", shortcut: "3", path: "/knowledge", icon: "knowledge" },
  { id: "retros",    label: "复盘",   shortcut: "4", path: "/retros",    icon: "retros" },
  { id: "artifacts", label: "产出",   shortcut: "5", path: "/artifacts", icon: "artifacts" },
  { id: "settings",  label: "设置",   shortcut: ",", path: "/settings",  icon: "settings" },
] as const;

export function surfaceForPath(pathname: string): Surface | undefined {
  return surfaces.find((s) => pathname === s.path || pathname.startsWith(s.path + "/"));
}

export function surfaceById(id: SurfaceId): Surface {
  const match = surfaces.find((s) => s.id === id);
  if (!match) throw new Error(`Unknown surface id: ${id}`);
  return match;
}
