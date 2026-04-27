import { describe, expect, it } from "vitest";
import { evaluateScenario } from "./evaluateScenario";

describe("evaluateScenario", () => {
  it("allows a safe neighbor-list update", () => {
    const evaluation = evaluateScenario("safe-neighbor-update");

    expect(evaluation.finalDecision).toBe("allow");
    expect(evaluation.decisions.every((decision) => decision.decision === "allow")).toBe(true);
  });

  it("denies n78 transmit-power drift", () => {
    const evaluation = evaluateScenario("n78-power-drift");

    expect(evaluation.finalDecision).toBe("deny");
    expect(evaluation.decisions.some((decision) => decision.policyName === "regional-ran-power-limit")).toBe(true);
    expect(evaluation.remediation).toContain("Reduce transmitPowerDbm");
  });

  it("requires approval for emergency-services site changes", () => {
    const evaluation = evaluateScenario("emergency-approval");

    expect(evaluation.finalDecision).toBe("approval-required");
    expect(evaluation.site.criticality).toBe("emergency-services");
  });

  it("denies production OSS/NMS lookup from the sandbox", () => {
    const evaluation = evaluateScenario("denied-oss-lookup");

    expect(evaluation.finalDecision).toBe("deny");
    expect(evaluation.commands.some((command) => command.status === "blocked")).toBe(true);
  });

  it("denies high-risk changes without rollback metadata", () => {
    const evaluation = evaluateScenario("missing-rollback");

    expect(evaluation.finalDecision).toBe("deny");
    expect(evaluation.scenario.change.rollbackPlan).toBe(false);
  });
});
