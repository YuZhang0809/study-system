type IconName =
  | "today"
  | "plan"
  | "knowledge"
  | "retros"
  | "artifacts"
  | "settings"
  | "plus"
  | "search"
  | "close"
  | "bug"
  | "concept"
  | "prompt"
  | "learning";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 14, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "today":
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="11" height="10" />
          <path d="M2.5 6.5h11M5 2v3M11 2v3M6 9l1.5 1.5L10 8" />
        </svg>
      );
    case "plan":
      return (
        <svg {...common}>
          <path d="M3 3h10v10H3z M3 6h10 M6 3v10" />
        </svg>
      );
    case "knowledge":
      return (
        <svg {...common}>
          <path d="M3 3.5h7l3 2.5v7H3z M10 3.5V6.5H13" />
        </svg>
      );
    case "retros":
      return (
        <svg {...common}>
          <path d="M3 13V3l5 4 5-4v10" />
        </svg>
      );
    case "artifacts":
      return (
        <svg {...common}>
          <path d="M4 4h6l2 2v6H4z M10 4v2h2" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="1.5" />
          <path d="M8 2v1.5 M8 12.5V14 M2 8h1.5 M12.5 8H14 M3.8 3.8l1 1 M11.2 11.2l1 1 M12.2 3.8l-1 1 M4.8 11.2l-1 1" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M8 3v10 M3 8h10" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="3.5" />
          <path d="M10 10l3 3" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M4 4l8 8 M12 4l-8 8" />
        </svg>
      );
    case "bug":
      return (
        <svg {...common}>
          <path d="M5 6a3 3 0 016 0v3a3 3 0 01-6 0z M3 7h2 M11 7h2 M3 10h2 M11 10h2 M8 3V2" />
        </svg>
      );
    case "prompt":
      return (
        <svg {...common}>
          <path d="M3 4h10v7H7l-3 2.5V11H3z" />
        </svg>
      );
    case "concept":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="1.5" />
          <circle cx="11" cy="5" r="1.5" />
          <circle cx="8" cy="11" r="1.5" />
          <path d="M6.2 5h3.6 M5.8 6L7.3 9.8 M10.2 6L8.7 9.8" />
        </svg>
      );
    case "learning":
      return (
        <svg {...common}>
          <path d="M3 4.5l5-2 5 2v2l-5 2-5-2z M3 9.5l5 2 5-2 M8 6.5V13" />
        </svg>
      );
  }
}
