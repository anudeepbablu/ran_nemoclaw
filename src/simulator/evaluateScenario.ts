import { ragEvidence, ranSites, scenarios } from "../data/fixtures";
import type {
  AgentEvent,
  AuditEntry,
  Decision,
  Evaluation,
  PolicyDecision,
  ScenarioId,
  ShellCommand
} from "../types";

const riskScores: Record<Evaluation["scenario"]["risk"], number> = {
  low: 18,
  medium: 48,
  high: 78,
  critical: 92
};

const recommendations: Record<ScenarioId, string> = {
  "safe-neighbor-update": "Allow the change after standard CI validation. Keep rollback metadata attached to the PR.",
  "n78-power-drift": "Reduce transmitPowerDbm to the approved Midwest n78 limit or request regional RF approval before retry.",
  "emergency-approval": "Pause auto-merge and route to senior RAN and public-safety approvers before execution.",
  "denied-oss-lookup": "Use synthetic inventory fixtures or request a scoped production-access approval outside the sandbox.",
  "missing-rollback": "Attach the rollback plan template and rerun validation before the change can merge."
};

function buildDecisions(id: ScenarioId): PolicyDecision[] {
  const common: PolicyDecision[] = [
    {
      id: `${id}-read-pr`,
      action: "Read proposed RAN config change",
      decision: "allow",
      reason: "PR and staging fixtures are approved monitoring inputs.",
      policyName: "sandbox-source-access"
    },
    {
      id: `${id}-rag`,
      action: "Query internal RAN policy evidence",
      decision: "allow",
      reason: "Simulated internal docs are in the allowed project scope.",
      policyName: "rag-scope-ran-engineering"
    },
    {
      id: `${id}-tests`,
      action: "Run local validation tests",
      decision: "allow",
      reason: "OpenShell permits local test commands in the sandbox.",
      policyName: "openshell-local-validation"
    }
  ];

  if (id === "n78-power-drift") {
    return [
      ...common,
      {
        id: `${id}-power`,
        action: "Approve transmitPowerDbm change",
        decision: "deny",
        reason: "41 dBm exceeds the approved Midwest n78 limit for this site profile.",
        policyName: "regional-ran-power-limit"
      }
    ];
  }

  if (id === "emergency-approval") {
    return [
      ...common,
      {
        id: `${id}-emergency`,
        action: "Auto-merge emergency-services site change",
        decision: "approval-required",
        reason: "Emergency-services coverage changes require elevated RAN and public-safety approval.",
        policyName: "emergency-services-change-control"
      }
    ];
  }

  if (id === "denied-oss-lookup") {
    return [
      ...common,
      {
        id: `${id}-oss`,
        action: "Query production OSS/NMS",
        decision: "deny",
        reason: "Production network systems are outside the sandbox access boundary.",
        policyName: "production-oss-access-deny"
      }
    ];
  }

  if (id === "missing-rollback") {
    return [
      ...common,
      {
        id: `${id}-rollback`,
        action: "Mark change merge-ready",
        decision: "deny",
        reason: "Rollback metadata is required for high-risk RAN parameter changes.",
        policyName: "rollback-plan-required"
      }
    ];
  }

  return [
    ...common,
    {
      id: `${id}-merge`,
      action: "Mark change merge-ready",
      decision: "allow",
      reason: "Change matches vendor schema, maintenance policy, and rollback requirements.",
      policyName: "standard-ran-change"
    }
  ];
}

function finalDecision(decisions: PolicyDecision[]): Decision {
  if (decisions.some((decision) => decision.decision === "deny")) {
    return "deny";
  }
  if (decisions.some((decision) => decision.decision === "approval-required")) {
    return "approval-required";
  }
  return "allow";
}

function buildCommands(id: ScenarioId): ShellCommand[] {
  const commands: ShellCommand[] = [
    {
      id: `${id}-rg`,
      command: "rg \"transmitPowerDbm|handoverThresholdDb|neighborCells\" fixtures/ran-config",
      status: "allowed",
      output: "Matched approved synthetic RAN config fixtures."
    },
    {
      id: `${id}-validate`,
      command: "npm test -- ran-policy-validator",
      status: "allowed",
      output: "Local validator completed inside OpenShell sandbox."
    }
  ];

  if (id === "denied-oss-lookup") {
    commands.push({
      id: `${id}-oss`,
      command: "curl https://prod-oss.internal/cell-sites/SEA-N258-017",
      status: "blocked",
      output: "Denied by production-oss-access-deny. Use synthetic inventory fixtures instead."
    });
  }

  if (id === "emergency-approval") {
    commands.push({
      id: `${id}-vendor-schema`,
      command: "curl https://vendor.example.com/schema/lte-b66.json",
      status: "approval-required",
      output: "External schema fetch requires operator approval."
    });
  }

  return commands;
}

function buildEvents(id: ScenarioId, decision: Decision): AgentEvent[] {
  const status = decision === "allow" ? "passed" : decision === "deny" ? "blocked" : "needs-approval";

  return [
    {
      id: `${id}-event-monitor`,
      changeId: id,
      kind: "monitor",
      status: "running",
      message: "24/7 monitor detected a proposed RAN config change.",
      timestamp: "10:33:04"
    },
    {
      id: `${id}-event-rag`,
      changeId: id,
      kind: "rag",
      status: "passed",
      message: "Retrieved scoped internal RAN policy evidence.",
      timestamp: "10:33:08"
    },
    {
      id: `${id}-event-shell`,
      changeId: id,
      kind: "shell",
      status,
      message: "OpenShell completed local validation and enforced command policy.",
      timestamp: "10:33:12"
    },
    {
      id: `${id}-event-policy`,
      changeId: id,
      kind: "policy",
      status,
      message: `Policy Engine returned ${decision}.`,
      timestamp: "10:33:16"
    },
    {
      id: `${id}-event-recommendation`,
      changeId: id,
      kind: "recommendation",
      status,
      message: recommendations[id],
      timestamp: "10:33:20"
    }
  ];
}

function buildAudit(id: ScenarioId, decision: Decision): AuditEntry[] {
  return [
    {
      id: `${id}-audit-monitor`,
      timestamp: "10:33:04",
      actor: "NemoClaw",
      summary: "Detected monitored RAN change and opened a sandbox evaluation."
    },
    {
      id: `${id}-audit-rag`,
      timestamp: "10:33:08",
      actor: "RAG",
      summary: "Returned only RAN engineering evidence in the approved project scope."
    },
    {
      id: `${id}-audit-shell`,
      timestamp: "10:33:12",
      actor: "OpenShell",
      summary: "Ran local fixture validation and enforced sandbox command boundaries."
    },
    {
      id: `${id}-audit-policy`,
      timestamp: "10:33:16",
      actor: "Policy Engine",
      summary: `Recorded final decision: ${decision}.`
    },
    {
      id: `${id}-audit-recommendation`,
      timestamp: "10:33:20",
      actor: "NemoClaw",
      summary: recommendations[id]
    }
  ];
}

export function evaluateScenario(id: ScenarioId): Evaluation {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}`);
  }

  const site = ranSites.find((item) => item.id === scenario.change.siteId);
  if (!site) {
    throw new Error(`Unknown site: ${scenario.change.siteId}`);
  }

  const decisions = buildDecisions(id);
  const decision = finalDecision(decisions);

  return {
    scenario,
    site,
    finalDecision: decision,
    riskScore: riskScores[scenario.risk],
    decisions,
    events: buildEvents(id, decision),
    evidence: ragEvidence.filter((item) => item.appliesTo.includes(id)),
    commands: buildCommands(id),
    audit: buildAudit(id, decision),
    remediation: recommendations[id]
  };
}

export function evaluateAllScenarios(): Evaluation[] {
  return scenarios.map((scenario) => evaluateScenario(scenario.id));
}
