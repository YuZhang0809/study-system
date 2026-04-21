export function Footer() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  return (
    <footer className="footer">
      <span>AI 关闭 (v1 只预览)</span>
      <span className="ml-auto">{dateStr}</span>
    </footer>
  );
}
