export type ScenarioId =
  | "safe-update"
  | "power-drift"
  | "emergency"
  | "oss-lookup"
  | "no-rollback";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Decision = "Allowed" | "Denied" | "Approval";
export type RuleVerdict = "pass" | "fail" | "skip" | "pending";
export type ShellStatus = "ok" | "warn" | "denied";
export type DiffOp = "+" | "−" | "~" | "?";

export type Tone = "good" | "warn" | "bad" | "muted";

export type DiffEntry = {
  op: DiffOp;
  path: string;
  value: string;
};

export type FailMode = "deny" | "approve";

export type PolicyRule = {
  id: string;
  name: string;
  verdict: RuleVerdict;
  input: string;
  onFail?: FailMode;
};

export type ShellCommand = {
  cmd: string;
  dur: number;
  status: ShellStatus;
  code: number;
  out: string;
};

export type TimelineKind =
  | "monitor"
  | "rag"
  | "policy"
  | "tests"
  | "guard"
  | "decision"
  | "audit";

export type TimelineEvent = {
  t: string;
  kind: TimelineKind;
  text: string;
};

export type RagConsumer = "rag" | "policy";

export type RagChunk = {
  id: string;
  section: string;
  sim: number;
  used: ReadonlyArray<RagConsumer>;
  body: string;
  highlight: string;
};

export type Scenario = {
  id: ScenarioId;
  title: string;
  short: string;
  severity: Severity;
  chg: string;
  site: string;
  vendor: string;
  band: string;
  region: string;
  summary: string;
  risk: number;
  decision: Decision;
  diff: DiffEntry[];
  rules: PolicyRule[];
  openshell: ShellCommand[];
  timeline: TimelineEvent[];
  rag: RagChunk[];
};

export type QueueItem = {
  id: string;
  title: string;
  meta: string;
  verdict: Decision;
  scenario?: ScenarioId;
};

export type AuditEntry = {
  t: string;
  actor: string;
  summary: string;
};

export type RunMode = "sandbox" | "dev";

export type AgentEvent =
  | { kind: "run.started"; runId: string; scenarioId: ScenarioId; mode?: RunMode; t: string }
  | { kind: "timeline"; runId: string; event: TimelineEvent }
  | { kind: "shell"; runId: string; command: ShellCommand }
  | { kind: "rag"; runId: string; chunk: RagChunk }
  | { kind: "policy"; runId: string; rule: PolicyRule }
  | {
      kind: "policy.proposal";
      runId: string;
      decision: Decision;
      rationale: string;
      t: string;
    }
  | {
      kind: "policy.verdict";
      runId: string;
      decision: Decision;
      proposed: Decision;
      overrode: boolean;
      risk: number;
      t: string;
    }
  | { kind: "audit"; runId: string; entry: AuditEntry }
  | { kind: "recommendation"; runId: string; text: string; t: string }
  | { kind: "run.complete"; runId: string; verdict: Decision; t: string }
  | { kind: "run.error"; runId: string; message: string; t: string };

// Events emitted by the host bridge (server/liveBridge.js) — distinct from
// the agent runner's events. The UI subscribes to /api/events and receives
// the union.
export type BridgeEvent =
  | { kind: "bridge.connected"; t: string }
  | {
      kind: "run.dispatched";
      runId: string;
      scenarioId: ScenarioId;
      mode: RunMode;
      cmd: string;
      t: string;
    }
  | { kind: "run.warning"; runId: string; message: string; t: string }
  | { kind: "run.exit"; runId: string; code: number; t: string };

export type WireEvent = AgentEvent | BridgeEvent;
