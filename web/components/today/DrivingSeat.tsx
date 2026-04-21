interface DrivingSeatProps {
  sentence: string;
}

export function DrivingSeat({ sentence }: DrivingSeatProps) {
  return <p className="today-driving-seat">{sentence}</p>;
}
