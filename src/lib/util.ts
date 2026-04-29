import { useEffect, useRef } from "react";
import type { DependencyList } from "react";
import { tokens } from "./tokens";
import type { Decision, RuleVerdict, ShellStatus, Severity, Tone } from "../types";

export function verdictTone(v: Decision | RuleVerdict | ShellStatus | string): Tone {
  if (v === "Allowed" || v === "pass" || v === "ok") return "good";
  if (v === "Approval" || v === "pending" || v === "warn") return "warn";
  if (v === "Denied" || v === "fail" || v === "denied") return "bad";
  return "muted";
}

export function severityTone(s: Severity): Tone {
  if (s === "CRITICAL" || s === "HIGH") return "bad";
  if (s === "MEDIUM") return "warn";
  if (s === "LOW") return "good";
  return "muted";
}

export function toneColor(t: Tone): string {
  if (t === "good") return tokens.good;
  if (t === "warn") return tokens.warn;
  if (t === "bad") return tokens.bad;
  return tokens.dim;
}

export function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

export function useStickyScroll<T extends HTMLElement>(
  deps: DependencyList,
  running: boolean
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (running) ref.current.scrollTop = ref.current.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
