import { Activity, Lock, Radar, ShieldCheck, TerminalSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { scenarios } from "./data/fixtures";
import { evaluateScenario } from "./simulator/evaluateScenario";
import type { ScenarioId } from "./types";

function App() {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("n78-power-drift");
  const evaluation = useMemo(() => evaluateScenario(activeScenario), [activeScenario]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">NemoClaw customer demo</div>
          <h1>24/7 RAN Configuration Drift Guard</h1>
          <p>
            A sandbox-hosted command center for showing how NemoClaw monitors telecom RAN changes,
            applies policy, and keeps production systems out of reach.
          </p>
        </div>
      </header>

      <section className="status-grid">
        <article className="status-card">
          <Lock size={24} />
          <strong>Brev sandbox</strong>
          <span>Development and demo execution stay inside the sandbox boundary.</span>
        </article>
        <article className="status-card">
          <ShieldCheck size={24} />
          <strong>Policy Engine</strong>
          <span>Allow, deny, and approval-required decisions are visible.</span>
        </article>
        <article className="status-card">
          <TerminalSquare size={24} />
          <strong>OpenShell</strong>
          <span>Commands are controlled, captured, and auditable.</span>
        </article>
        <article className="status-card">
          <Radar size={24} />
          <strong>24/7 monitor</strong>
          <span>The agent watches approved RAN change inputs continuously.</span>
        </article>
      </section>

      <section className="demo-grid">
        <aside className="scenario-panel">
          <h2>Scenario Injection</h2>
          {scenarios.map((scenario) => (
            <button
              className={scenario.id === activeScenario ? "scenario active" : "scenario"}
              key={scenario.id}
              onClick={() => setActiveScenario(scenario.id)}
            >
              <span>{scenario.shortLabel}</span>
              <small>{scenario.risk}</small>
            </button>
          ))}
        </aside>

        <section className="evaluation-panel">
          <div className="panel-heading">
            <Activity size={20} />
            Active Evaluation
          </div>
          <h2>{evaluation.scenario.label}</h2>
          <p>{evaluation.scenario.description}</p>
          <div className="decision-banner">
            <strong>{evaluation.finalDecision}</strong>
            <span>Risk score {evaluation.riskScore}/100</span>
          </div>
          <div className="decision-list">
            {evaluation.decisions.map((decision) => (
              <article key={decision.id}>
                <strong>{decision.action}</strong>
                <span>{decision.decision}</span>
                <p>{decision.reason}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
