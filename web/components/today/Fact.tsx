interface FactProps {
  label: string;
  value: React.ReactNode;
}

export function Fact({ label, value }: FactProps) {
  return (
    <div className="today-fact">
      <span>{label}</span>
      <span className="today-fact-value">{value}</span>
    </div>
  );
}
