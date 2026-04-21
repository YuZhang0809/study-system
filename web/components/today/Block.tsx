interface BlockProps {
  heading: string;
  children: React.ReactNode;
  count?: number;
}

export function Block({ heading, children, count }: BlockProps) {
  return (
    <section>
      <div className="block-label">
        <span>{heading}</span>
        {count !== undefined ? <span className="count num">· {count}</span> : null}
      </div>
      <div className="card">{children}</div>
    </section>
  );
}
