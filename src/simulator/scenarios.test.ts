import { describe, expect, it } from "vitest";
import { scenarios } from "../data/fixtures";
import type { ScenarioId } from "../types";

function get(id: ScenarioId) {
  const s = scenarios.find((x) => x.id === id);
  if (!s) throw new Error(`scenario not found: ${id}`);
  return s;
}

describe("scenarios", () => {
  it("safe-update: every rule passes or skips, verdict Allowed", () => {
    const s = get("safe-update");
    expect(s.decision).toBe("Allowed");
    expect(s.rules.every((r) => r.verdict === "pass" || r.verdict === "skip")).toBe(true);
    expect(s.openshell.every((c) => c.status !== "denied")).toBe(true);
  });

  it("power-drift: power-envelope rule fails, verdict Denied", () => {
    const s = get("power-drift");
    expect(s.decision).toBe("Denied");
    const power = s.rules.find((r) => r.id === "P-022");
    expect(power?.verdict).toBe("fail");
    expect(s.rules.some((r) => r.verdict === "fail")).toBe(true);
  });

  it("emergency: pending two-person approval, verdict Approval", () => {
    const s = get("emergency");
    expect(s.decision).toBe("Approval");
    expect(s.rules.some((r) => r.verdict === "pending")).toBe(true);
    expect(s.severity).toBe("CRITICAL");
  });

  it("oss-lookup: production OSS reach fails, OpenShell denies the call", () => {
    const s = get("oss-lookup");
    expect(s.decision).toBe("Denied");
    const oss = s.rules.find((r) => r.id === "P-040");
    expect(oss?.verdict).toBe("fail");
    expect(s.openshell.some((c) => c.status === "denied")).toBe(true);
  });

  it("no-rollback: rollback + tests rules fail, verdict Denied", () => {
    const s = get("no-rollback");
    expect(s.decision).toBe("Denied");
    const rollback = s.rules.find((r) => r.id === "P-090");
    const tests = s.rules.find((r) => r.id === "P-091");
    expect(rollback?.verdict).toBe("fail");
    expect(tests?.verdict).toBe("fail");
  });

  it("every scenario has a non-empty timeline, openshell, rules, and rag", () => {
    for (const s of scenarios) {
      expect(s.timeline.length).toBeGreaterThan(0);
      expect(s.openshell.length).toBeGreaterThan(0);
      expect(s.rules.length).toBeGreaterThan(0);
      expect(s.rag.length).toBeGreaterThan(0);
    }
  });
});
