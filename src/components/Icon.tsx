import type { CSSProperties } from "react";

export type IconName =
  | "pulse"
  | "shield"
  | "terminal"
  | "doc"
  | "list"
  | "gear"
  | "check"
  | "x"
  | "minus"
  | "dot"
  | "arrow"
  | "lock"
  | "unlock"
  | "play"
  | "refresh"
  | "queue"
  | "audit"
  | "chev"
  | "chevd"
  | "spark"
  | "sandbox"
  | "flag"
  | "cpu"
  | "tower";

export function Icon({
  name,
  size = 16,
  stroke = 1.6
}: {
  name: IconName;
  size?: number;
  stroke?: number;
}) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  switch (name) {
    case "pulse":
      return (
        <svg {...p}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...p}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 9l3 3-3 3M13 15h4" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
          <path d="M14 3v6h6M8 13h8M8 17h6" />
        </svg>
      );
    case "list":
      return (
        <svg {...p}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "gear":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="M5 12l5 5L20 7" />
        </svg>
      );
    case "x":
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "minus":
      return (
        <svg {...p}>
          <path d="M5 12h14" />
        </svg>
      );
    case "dot":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...p}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      );
    case "unlock":
      return (
        <svg {...p}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 017.5-1.5" />
        </svg>
      );
    case "play":
      return (
        <svg {...p}>
          <path d="M6 4l14 8L6 20z" fill="currentColor" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...p}>
          <path d="M3 12a9 9 0 0115-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 01-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      );
    case "queue":
      return (
        <svg {...p}>
          <path d="M3 6h18M3 12h12M3 18h18" />
        </svg>
      );
    case "audit":
      return (
        <svg {...p}>
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
          <path d="M16 3v5h5M9 13l2 2 4-4" />
        </svg>
      );
    case "chev":
      return (
        <svg {...p}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      );
    case "chevd":
      return (
        <svg {...p}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...p}>
          <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        </svg>
      );
    case "sandbox":
      return (
        <svg {...p}>
          <path d="M3 7l9-4 9 4-9 4z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </svg>
      );
    case "flag":
      return (
        <svg {...p}>
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
      );
    case "cpu":
      return (
        <svg {...p}>
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
          <path d="M9 9h6v6H9z" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
        </svg>
      );
    case "tower":
      return (
        <svg {...p}>
          <path d="M5 4l2 16M19 4l-2 16M8 8h8M9.5 12h5M11 20h2" />
        </svg>
      );
    default:
      return null;
  }
}

export function LiveDot({
  color = "#10b981",
  size = 8
}: {
  color?: string;
  size?: number;
}) {
  const wrap: CSSProperties = { position: "relative", width: size, height: size, display: "inline-block" };
  const halo: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: color,
    opacity: 0.4,
    animation: "rdgPulse 1.6s ease-out infinite"
  };
  const core: CSSProperties = {
    position: "absolute",
    inset: 1,
    borderRadius: "50%",
    background: color
  };
  return (
    <span style={wrap}>
      <span style={halo} />
      <span style={core} />
      <style>{`@keyframes rdgPulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(2.4); opacity: 0 } }`}</style>
    </span>
  );
}
