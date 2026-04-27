import { Lock, Radar, ShieldCheck, TerminalSquare } from "lucide-react";

function App() {
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
    </main>
  );
}

export default App;
