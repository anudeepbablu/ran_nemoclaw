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
