import { ExportJsonButton } from "@/components/settings/ExportJsonButton";

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">设置</h1>
      </div>

      <section className="card" style={{ maxWidth: 720, padding: "14px 18px" }}>
        <div className="block-label">数据库</div>
        <div className="mono t-xs ink-4" style={{ marginBottom: 10 }}>
          全库导出，不按当前项目筛选。
        </div>
        <ExportJsonButton />
      </section>
    </div>
  );
}
