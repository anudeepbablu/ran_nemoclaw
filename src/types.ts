export type Vendor = "Ericsson" | "Nokia" | "Samsung";
export type Band = "n78" | "n41" | "n258" | "LTE-B66";
export type SiteCriticality = "standard" | "critical" | "emergency-services";
export type Decision = "allow" | "deny" | "approval-required";
export type ScenarioId =
  | "safe-neighbor-update"
  | "n78-power-drift"
  | "emergency-approval"
  | "denied-oss-lookup"
  | "missing-rollback";

export type RanSite = {
  id: string;
  name: string;
  region: string;
  market: string;
  vendor: Vendor;
  band: Band;
  criticality: SiteCriticality;
  coordinates: {
    x: number;
    y: number;
  };
};

export type ConfigChange = {
  id: string;
  scenarioId: ScenarioId;
  title: string;
  siteId: string;
  source: "PR" | "change-queue" | "staging-feed";
  parameter: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
  timestamp: string;
  requestedBy: string;
  rollbackPlan: boolean;
};

export type PolicyDecision = {
  id: string;
  action: string;
  decision: Decision;
  reason: string;
  policyName: string;
};

export type AgentEvent = {
  id: string;
  changeId: string;
  kind: "monitor" | "rag" | "policy" | "shell" | "test" | "recommendation";
  status: "running" | "passed" | "blocked" | "needs-approval";
  message: string;
  timestamp: string;
};

export type RagEvidence = {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  confidence: number;
  appliesTo: ScenarioId[];
};

export type ShellCommand = {
  id: string;
  command: string;
  status: "allowed" | "blocked" | "approval-required";
  output: string;
};

export type AuditEntry = {
  id: string;
  timestamp: string;
  actor: "NemoClaw" | "Policy Engine" | "OpenShell" | "RAG";
  summary: string;
};

export type Scenario = {
  id: ScenarioId;
  label: string;
  shortLabel: string;
  risk: "low" | "medium" | "high" | "critical";
  description: string;
  change: ConfigChange;
};

export type Evaluation = {
  scenario: Scenario;
  site: RanSite;
  finalDecision: Decision;
  riskScore: number;
  decisions: PolicyDecision[];
  events: AgentEvent[];
  evidence: RagEvidence[];
  commands: ShellCommand[];
  audit: AuditEntry[];
  remediation: string;
};
