interface PlaceholderPaneProps {
  title: string;
}

export function PlaceholderPane({ title }: PlaceholderPaneProps) {
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">{title}</h1>
      </div>
      <p className="empty">本页面将在后续 slice 中落地。</p>
    </div>
  );
}
