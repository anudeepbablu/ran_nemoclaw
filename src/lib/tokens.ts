export const tokens = {
  bg: "#0f1418",
  bg2: "#141a20",
  panel: "#171e25",
  panel2: "#1d2530",
  border: "#252e3a",
  borderHi: "#37475c",
  text: "#e6ecf2",
  dim: "#8593a6",
  faint: "#5a6779",
  accent: "#5eb6a8",
  accent2: "#7a9bd1",
  good: "#6cc596",
  warn: "#e0b878",
  bad: "#e08585",
  sans: '"IBM Plex Sans", "Geist", -apple-system, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace'
} as const;

export type Tokens = typeof tokens;
