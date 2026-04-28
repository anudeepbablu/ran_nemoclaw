import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  GitPullRequest,
  Lock,
  Network,
  Play,
  Radar,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ranSites, scenarios } from "./data/fixtures";
import { evaluateAllScenarios, evaluateScenario } from "./simulator/evaluateScenario";
import type { Decision, Evaluation, ScenarioId } from "./types";

type ViewId = "monitor" | "impact" | "policy" | "openshell" | "rag" | "audit";

const views: Array<{ id: ViewId; label: string; icon: typeof Activity }> = [
  { id: "monitor", label: "Live Monitor", icon: Activity },
  { id: "impact", label: "RAN Impact", icon: Network },
  { id: "policy", label: "Policy Engine", icon: ShieldCheck },
  { id: "openshell", label: "OpenShell", icon: TerminalSquare },
  { id: "rag", label: "RAG Evidence", icon: FileSearch },
  { id: "audit", label: "Audit Trail", icon: ClipboardList }
];

const decisionLabels: Record<Decision, string> = {
  allow: "Allowed",
  deny: "Denied",
  "approval-required": "Approval Required"
};

const liveApiBase = import.meta.env.VITE_LIVE_API_BASE || "http://localhost:8787";

type LiveStatus = {
  envFilePresent: boolean;
  nvidiaApiKeyPresent: boolean;
  sandboxName: string;
  nemoclawPresent: boolean;
  openshellPresent: boolean;
  dockerReachable: boolean;
  nemoclawList: string;
  liveBridgePort: number;
};

type LiveEvent = {
  id?: string;
  timestamp?: string;
  kind: string;
  level: string;
  message: string;
  command?: string;
  detail?: LiveStatus;
};

function statusIcon(decision: Decision) {
  if (decision === "allow") {
    return <CheckCircle2 size={18} />;
  }
  if (decision === "deny") {
    return <XCircle size={18} />;
  }
  return <AlertTriangle size={18} />;
}

function App() {
  const [activeView, setActiveView] = useState<ViewId>("monitor");
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("n78-power-drift");
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isRunningLiveScenario, setIsRunningLiveScenario] = useState(false);
  const evaluation = useMemo(() => evaluateScenario(activeScenario), [activeScenario]);
  const history = useMemo(() => evaluateAllScenarios(), []);

  useEffect(() => {
    refreshLiveStatus();
    const source = new EventSource(`${liveApiBase}/api/live/events`);
    source.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as LiveEvent;
      setLiveEvents((current) => [parsed, ...current].slice(0, 30));
    };
    source.onerror = () => {
      setLiveError("Live bridge is not reachable. Start it with npm run dev:bridge or sh scripts/docker-dev.sh.");
    };
    return () => source.close();
  }, []);

  async function refreshLiveStatus() {
    try {
      const response = await fetch(`${liveApiBase}/api/live/status`);
      const status = (await response.json()) as LiveStatus;
      setLiveStatus(status);
      setLiveError(null);
    } catch {
      setLiveError("Live bridge is not reachable. Start it with npm run dev:bridge or sh scripts/docker-dev.sh.");
    }
  }

  async function runLiveScenario() {
    setIsRunningLiveScenario(true);
    try {
      const response = await fetch(`${liveApiBase}/api/live/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeScenario })
      });
      const result = await response.json();
      if (!result.ok) {
        setLiveError(result.error || "Live NemoClaw run did not start.");
      }
    } catch {
      setLiveError("Failed to call the live NemoClaw bridge.");
    } finally {
      setIsRunningLiveScenario(false);
      refreshLiveStatus();
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">NemoClaw customer demo</div>
          <h1>24/7 RAN Configuration Drift Guard</h1>
        </div>
        <div className="sandbox-strip" aria-label="Sandbox status">
          <StatusPill label="Brev Sandbox" tone="good" />
          <StatusPill label="OpenShell" tone="good" />
          <StatusPill label="Policy Engine" tone="good" />
          <StatusPill label="Production OSS Denied" tone="danger" />
          <StatusPill label="PII Denied" tone="danger" />
        </div>
      </header>

      <section className="workspace">
        <aside className="scenario-rail">
          <div className="rail-heading">
            <Radar size={18} />
            Scenarios
          </div>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button
                className={`scenario-button ${scenario.id === activeScenario ? "is-active" : ""}`}
                key={scenario.id}
                onClick={() => setActiveScenario(scenario.id)}
              >
                <span>{scenario.shortLabel}</span>
                <small>{scenario.risk}</small>
              </button>
            ))}
          </div>
          <div className="boundary-panel">
            <div className="panel-kicker">
              <Lock size={16} />
              Sandbox Boundary
            </div>
            <BoundaryRow label="Host filesystem" value="Scoped" tone="neutral" />
            <BoundaryRow label="Internal RAG" value="Allowed" tone="good" />
            <BoundaryRow label="Unit tests" value="Allowed" tone="good" />
            <BoundaryRow label="Vendor fetch" value="Approval" tone="warn" />
            <BoundaryRow label="Production OSS" value="Denied" tone="danger" />
            <BoundaryRow label="Secrets / PII" value="Denied" tone="danger" />
          </div>
        </aside>

        <section className="content">
          <nav className="tabs" aria-label="Demo views">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  className={activeView === view.id ? "tab is-active" : "tab"}
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                >
                  <Icon size={17} />
                  {view.label}
                </button>
              );
            })}
          </nav>

          <LiveNemoClawPanel
            activeScenario={activeScenario}
            liveError={liveError}
            liveEvents={liveEvents}
            liveStatus={liveStatus}
            isRunningLiveScenario={isRunningLiveScenario}
            onRefresh={refreshLiveStatus}
            onRun={runLiveScenario}
          />

          <DashboardHeader evaluation={evaluation} />

          {activeView === "monitor" && <LiveMonitor evaluation={evaluation} history={history} />}
          {activeView === "impact" && <RanImpact evaluation={evaluation} />}
          {activeView === "policy" && <PolicyEngine evaluation={evaluation} />}
          {activeView === "openshell" && <OpenShellView evaluation={evaluation} />}
          {activeView === "rag" && <RagEvidenceView evaluation={evaluation} />}
          {activeView === "audit" && <AuditTrail evaluation={evaluation} />}
        </section>
      </section>
    </main>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "good" | "danger" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function LiveNemoClawPanel({
  activeScenario,
  liveError,
  liveEvents,
  liveStatus,
  isRunningLiveScenario,
  onRefresh,
  onRun
}: {
  activeScenario: ScenarioId;
  liveError: string | null;
  liveEvents: LiveEvent[];
  liveStatus: LiveStatus | null;
  isRunningLiveScenario: boolean;
  onRefresh: () => void;
  onRun: () => void;
}) {
  const liveReady =
    Boolean(liveStatus?.envFilePresent) &&
    Boolean(liveStatus?.nvidiaApiKeyPresent) &&
    Boolean(liveStatus?.nemoclawPresent) &&
    Boolean(liveStatus?.dockerReachable);

  return (
    <section className={`live-panel ${liveReady ? "is-live" : "is-waiting"}`}>
      <div className="live-panel-main">
        <div className="panel-kicker">
          <Activity size={16} />
          Live NemoClaw Runtime
        </div>
        <h2>{liveReady ? "Connected to live NemoClaw path" : "Waiting for live NemoClaw setup"}</h2>
        <p>
          Scenario buttons call a host-side bridge that runs NemoClaw/OpenShell commands and streams
          real stdout, stderr, and status events into this UI.
        </p>
        {liveError ? <p className="live-error">{liveError}</p> : null}
      </div>
      <div className="live-actions">
        <button className="tab" onClick={onRefresh}>
          Refresh
        </button>
        <button className="tab is-active" disabled={isRunningLiveScenario} onClick={onRun}>
          {isRunningLiveScenario ? "Starting..." : `Run ${activeScenario}`}
        </button>
      </div>
      <div className="live-status-grid">
        <BoundaryRow label=".env" value={liveStatus?.envFilePresent ? "Present" : "Missing"} tone={liveStatus?.envFilePresent ? "good" : "danger"} />
        <BoundaryRow label="NVIDIA key" value={liveStatus?.nvidiaApiKeyPresent ? "Present" : "Missing"} tone={liveStatus?.nvidiaApiKeyPresent ? "good" : "danger"} />
        <BoundaryRow label="Docker" value={liveStatus?.dockerReachable ? "Ready" : "Missing"} tone={liveStatus?.dockerReachable ? "good" : "danger"} />
        <BoundaryRow label="NemoClaw" value={liveStatus?.nemoclawPresent ? "Ready" : "Missing"} tone={liveStatus?.nemoclawPresent ? "good" : "danger"} />
        <BoundaryRow label="OpenShell" value={liveStatus?.openshellPresent ? "Ready" : "Missing"} tone={liveStatus?.openshellPresent ? "good" : "warn"} />
        <BoundaryRow label="Sandbox" value={liveStatus?.sandboxName || "ran-drift-demo"} tone="neutral" />
      </div>
      <div className="live-events">
        {liveEvents.length === 0 ? (
          <p>No live bridge events yet.</p>
        ) : (
          liveEvents.slice(0, 5).map((event, index) => (
            <article className={`live-event ${event.level}`} key={event.id || `${event.kind}-${index}`}>
              <strong>{event.kind}</strong>
              <p>{event.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function BoundaryRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "danger" | "neutral";
}) {
  return (
    <div className="boundary-row">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function DashboardHeader({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className={`summary-band decision-${evaluation.finalDecision}`}>
      <div>
        <div className="eyebrow">{evaluation.scenario.change.id}</div>
        <h2>{evaluation.scenario.label}</h2>
        <p>{evaluation.scenario.description}</p>
      </div>
      <div className="summary-metrics">
        <Metric label="Decision" value={decisionLabels[evaluation.finalDecision]} decision={evaluation.finalDecision} />
        <Metric label="Risk Score" value={`${evaluation.riskScore}/100`} />
        <Metric label="Site" value={evaluation.site.id} />
      </div>
    </section>
  );
}

function Metric({ label, value, decision }: { label: string; value: string; decision?: Decision }) {
  return (
    <div className={`metric ${decision ? `decision-${decision}` : ""}`}>
      <span>{label}</span>
      <strong>{decision ? statusIcon(decision) : null}{value}</strong>
    </div>
  );
}

function LiveMonitor({ evaluation, history }: { evaluation: Evaluation; history: Evaluation[] }) {
  return (
    <section className="view-grid two-col">
      <div className="panel">
        <div className="panel-title">
          <Activity size={18} />
          Agent Timeline
        </div>
        <div className="event-feed">
          {evaluation.events.map((event) => (
            <article className={`event-row ${event.status}`} key={event.id}>
              <time>{event.timestamp}</time>
              <div>
                <strong>{event.kind}</strong>
                <p>{event.message}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">
          <GitPullRequest size={18} />
          Monitored Queue
        </div>
        <div className="queue-list">
          {history.map((item) => (
            <article className="queue-item" key={item.scenario.id}>
              <div>
                <strong>{item.scenario.change.title}</strong>
                <span>{item.site.market} / {item.site.vendor} / {item.site.band}</span>
              </div>
              <span className={`decision-chip decision-${item.finalDecision}`}>{decisionLabels[item.finalDecision]}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RanImpact({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className="view-grid two-col">
      <div className="panel topology-panel">
        <div className="panel-title">
          <Network size={18} />
          Impact Map
        </div>
        <div className="topology-map" aria-label="Synthetic RAN topology map">
          {ranSites.map((site) => (
            <div
              className={`site-node ${site.id === evaluation.site.id ? "active" : ""} ${site.criticality}`}
              key={site.id}
              style={{ left: `${site.coordinates.x}%`, top: `${site.coordinates.y}%` }}
            >
              <span>{site.market}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">
          <Radar size={18} />
          Site Context
        </div>
        <div className="detail-grid">
          <Detail label="Site" value={evaluation.site.name} />
          <Detail label="Region" value={evaluation.site.region} />
          <Detail label="Vendor" value={evaluation.site.vendor} />
          <Detail label="Band" value={evaluation.site.band} />
          <Detail label="Criticality" value={evaluation.site.criticality} />
          <Detail label="Parameter" value={evaluation.scenario.change.parameter} />
          <Detail label="Before" value={String(evaluation.scenario.change.before)} />
          <Detail label="After" value={String(evaluation.scenario.change.after)} />
        </div>
      </div>
    </section>
  );
}

function PolicyEngine({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className="view-grid">
      <div className="decision-matrix">
        {evaluation.decisions.map((decision) => (
          <article className={`policy-card decision-${decision.decision}`} key={decision.id}>
            <div className="policy-card-top">
              <span>{statusIcon(decision.decision)}</span>
              <strong>{decision.action}</strong>
            </div>
            <p>{decision.reason}</p>
            <small>{decision.policyName}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function OpenShellView({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className="view-grid">
      <div className="terminal-panel">
        {evaluation.commands.map((command) => (
          <article className={`command-row ${command.status}`} key={command.id}>
            <div className="command-line">
              <Play size={15} />
              <code>{command.command}</code>
              <span>{command.status}</span>
            </div>
            <p>{command.output}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RagEvidenceView({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className="evidence-grid">
      {evaluation.evidence.map((evidence) => (
        <article className="evidence-card" key={evidence.id}>
          <div className="panel-kicker">
            <FileSearch size={16} />
            {evidence.source}
          </div>
          <h3>{evidence.title}</h3>
          <p>{evidence.excerpt}</p>
          <div className="confidence">
            <span>Confidence</span>
            <strong>{Math.round(evidence.confidence * 100)}%</strong>
          </div>
        </article>
      ))}
    </section>
  );
}

function AuditTrail({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className="view-grid two-col">
      <div className="panel">
        <div className="panel-title">
          <ClipboardList size={18} />
          Trace
        </div>
        <div className="audit-list">
          {evaluation.audit.map((entry) => (
            <article className="audit-row" key={entry.id}>
              <time>{entry.timestamp}</time>
              <div>
                <strong>{entry.actor}</strong>
                <p>{entry.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel recommendation">
        <div className="panel-title">
          <RotateCcw size={18} />
          Remediation
        </div>
        <p>{evaluation.remediation}</p>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
