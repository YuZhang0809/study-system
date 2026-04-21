interface BlockProps {
  heading: string;
  children: React.ReactNode;
  count?: number;
  ruled?: boolean;
}

export function Block({ heading, children, count, ruled = false }: BlockProps) {
  return (
    <section>
      <div className="block-label">
        <span>{heading}</span>
        {count !== undefined ? <span className="count num">· {count}</span> : null}
      </div>
      <div className={ruled ? "card card--ruled" : "card"}>{children}</div>
    </section>
  );
}
