interface FactStripProps {
  children: React.ReactNode;
}

export function FactStrip({ children }: FactStripProps) {
  return <div className="today-fact-strip">{children}</div>;
}
