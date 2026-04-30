import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Icon, LiveDot } from "./components/Icon";
import type { IconName } from "./components/Icon";
import { tokens as T } from "./lib/tokens";
import { fmtMs, severityTone, toneColor, verdictTone } from "./lib/util";
import { useAgentRun } from "./simulator/useAgentRun";
import type { AgentRunner } from "./simulator/useAgentRun";
import type { DiffOp, RunMode, Tone } from "./types";

const liveApiBase = import.meta.env.VITE_LIVE_API_BASE || "http://localhost:8787";

type LiveStatus = {
  envFilePresent: boolean;
  nvidiaApiKeyPresent: boolean;
  sandboxName: string;
  openshellPresent: boolean;
  sandboxPresent: boolean;
  dockerReachable: boolean;
  sandboxList: string;
  liveBridgePort: number;
  mode: RunMode;
};

type TabId = "live" | "impact" | "policy" | "shell" | "rag" | "audit";

export default function App() {
  const [tab, setTab] = useState<TabId>("live");
  const [diag, setDiag] = useState(false);
  const runner = useAgentRun("power-drift");

  const tabContent: Record<TabId, ReactNode> = {
    live: <Live runner={runner} />,
    impact: <Impact runner={runner} />,
    policy: <Policy runner={runner} />,
    shell: <Shell runner={runner} />,
    rag: <Rag runner={runner} />,
    audit: <Audit runner={runner} />
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: T.sans,
        display: "flex"
      }}
    >
      <Sidebar runner={runner} onOpenDiag={() => setDiag(true)} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <BridgeBanner runner={runner} />
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 28px",
            borderBottom: `1px solid ${T.border}`,
            minHeight: 60
          }}
        >
          <div style={{ fontSize: 14, color: T.dim }}>
            Customer demo · 24/7 RAN configuration drift guard
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Pill tone="good" soft>Brev sandbox</Pill>
            <Pill tone="good" soft>OpenShell</Pill>
            <Pill tone="good" soft>Policy engine</Pill>
            <Pill tone="bad" soft>Production OSS denied</Pill>
            <Pill tone="bad" soft>PII denied</Pill>
          </div>
        </header>
        <ScenarioHeader runner={runner} />
        <div style={{ padding: "12px 28px 0" }}>
          <Tabs tab={tab} setTab={setTab} />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: "20px 28px 28px",
            display: "flex"
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {tabContent[tab]}
          </div>
        </div>
      </main>
      <Diagnostics open={diag} onClose={() => setDiag(false)} />
    </div>
  );
}

function BridgeBanner({ runner }: { runner: AgentRunner }) {
  if (runner.bridgeStatus === "connected") return null;
  const message =
    runner.bridgeStatus === "error"
      ? "Bridge offline — showing static fixture data. Start the bridge with npm run dev."
      : "Connecting to host bridge…";
  return (
    <div
      style={{
        background: runner.bridgeStatus === "error" ? `${T.bad}1f` : `${T.warn}1f`,
        borderBottom: `1px solid ${runner.bridgeStatus === "error" ? T.bad : T.warn}`,
        padding: "8px 28px",
        fontSize: 12.5,
        color: runner.bridgeStatus === "error" ? T.bad : T.warn,
        display: "flex",
        alignItems: "center",
        gap: 10
      }}
    >
      <Icon name="pulse" size={12} />
      {message}
    </div>
  );
}

function Pill({
  tone = "muted",
  children,
  soft = false
}: {
  tone?: Tone;
  children: ReactNode;
  soft?: boolean;
}) {
  const c = toneColor(tone);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: soft ? "3px 9px" : "4px 10px",
        borderRadius: 100,
        fontSize: 11.5,
        fontFamily: T.sans,
        fontWeight: 500,
        color: c,
        background: `${c}1f`,
        border: `1px solid ${c}33`
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c,
          display: "inline-block"
        }}
      />
      {children}
    </span>
  );
}

function Panel({
  title,
  eyebrow,
  right,
  children,
  pad = 22
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  pad?: number;
}) {
  return (
    <section
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }}
    >
      {(title || eyebrow || right) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 22px 14px",
            borderBottom: `1px solid ${T.border}`
          }}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div
                style={{
                  fontSize: 11,
                  color: T.dim,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 3
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{title}</div>
            )}
          </div>
          <span style={{ flex: 1 }} />
          {right}
        </header>
      )}
      <div style={{ padding: pad, flex: 1, minHeight: 0, overflow: "auto" }}>{children}</div>
    </section>
  );
}

function Sidebar({
  runner,
  onOpenDiag
}: {
  runner: AgentRunner;
  onOpenDiag: () => void;
}) {
  return (
    <aside
      style={{
        width: 256,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: "22px 18px",
        borderRight: `1px solid ${T.border}`,
        background: T.bg2,
        minHeight: "100vh"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.bg
          }}
        >
          <Icon name="shield" size={16} />
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>RAN Drift Guard</div>
          <div style={{ fontSize: 11, color: T.dim }}>NemoClaw · 24/7</div>
        </div>
      </div>

      <div>
        <SectionLabel>Scenarios</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {runner.scenarios.map((s) => {
            const active = s.id === runner.scenarioId;
            const tone = severityTone(s.severity);
            return (
              <button
                key={s.id}
                onClick={() => runner.setScenarioId(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: active ? T.panel : "transparent",
                  border: `1px solid ${active ? T.borderHi : "transparent"}`,
                  color: active ? T.text : T.dim,
                  textAlign: "left",
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: toneColor(tone)
                    }}
                  />
                  {s.short}
                </span>
                <span style={{ fontSize: 10, color: toneColor(tone), letterSpacing: 0.5 }}>
                  {s.severity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>
          <Icon name="lock" size={11} /> Sandbox Boundary
        </SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, marginTop: 8 }}>
          {(
            [
              ["Host filesystem", "Scoped", "muted"],
              ["Internal RAG", "Allowed", "good"],
              ["Unit tests", "Allowed", "good"],
              ["Vendor fetch", "Approval", "warn"],
              ["Production OSS", "Denied", "bad"],
              ["Secrets / PII", "Denied", "bad"]
            ] as Array<[string, string, Tone]>
          ).map(([k, v, t]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.dim }}>{k}</span>
              <span style={{ color: toneColor(t), fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <span style={{ flex: 1 }} />

      <button
        onClick={onOpenDiag}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 8,
          background: "transparent",
          border: `1px solid ${T.border}`,
          cursor: "pointer",
          color: T.dim,
          fontFamily: T.sans,
          fontSize: 12.5
        }}
      >
        <Icon name="gear" size={12} /> Diagnostics
      </button>
    </aside>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: T.dim,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        gap: 6
      }}
    >
      {children}
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: TabId; setTab: (id: TabId) => void }) {
  const tabs: Array<{ id: TabId; label: string; icon: IconName }> = [
    { id: "live", label: "Live monitor", icon: "pulse" },
    { id: "impact", label: "RAN impact", icon: "tower" },
    { id: "policy", label: "Policy", icon: "shield" },
    { id: "shell", label: "OpenShell", icon: "terminal" },
    { id: "rag", label: "Evidence", icon: "doc" },
    { id: "audit", label: "Audit", icon: "audit" }
  ];
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}` }}>
      {tabs.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              cursor: "pointer",
              background: "transparent",
              color: active ? T.text : T.dim,
              border: "none",
              borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
              marginBottom: -1,
              fontFamily: T.sans,
              fontSize: 13.5,
              fontWeight: active ? 600 : 500
            }}
          >
            <Icon name={t.icon} size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ModePill({ mode, source }: { mode: RunMode | null; source: "live" | "static" }) {
  if (source === "static") {
    return (
      <span style={{ fontSize: 11, color: T.faint, letterSpacing: 0.5 }}>idle</span>
    );
  }
  if (mode === "sandbox") {
    return <Pill tone="good" soft>OpenShell sandbox</Pill>;
  }
  if (mode === "dev") {
    return <Pill tone="warn" soft>dev fallback</Pill>;
  }
  return null;
}

function ScenarioHeader({ runner }: { runner: AgentRunner }) {
  const { scenario, decision } = runner;
  const tone = verdictTone(decision);
  const buttonLabel = runner.running ? "Running…" : runner.source === "live" ? "Re-run" : "Run";
  return (
    <div style={{ padding: "24px 28px 4px", display: "flex", alignItems: "flex-start", gap: 28, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.dim }}>{scenario.chg}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.faint }} />
          <Pill tone={severityTone(scenario.severity)}>{scenario.severity}</Pill>
          <span style={{ fontSize: 12, color: T.dim }}>
            {scenario.region} · {scenario.vendor} · {scenario.band}
          </span>
          <ModePill mode={runner.mode} source={runner.source} />
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 26,
            fontWeight: 600,
            color: T.text,
            letterSpacing: -0.3
          }}
        >
          {scenario.title}
        </h2>
        <p style={{ margin: 0, color: T.dim, fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>
          {scenario.summary}
        </p>
        {runner.startError && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: T.bad,
              fontFamily: T.mono
            }}
          >
            run failed: {runner.startError}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <StatCard label="Decision" value={decision} tone={tone} />
        <StatCard
          label="Risk"
          value={`${runner.risk}`}
          sub="/100"
          tone={runner.risk >= 60 ? "bad" : runner.risk >= 40 ? "warn" : "good"}
        />
        <StatCard label="Site" value={scenario.site} mono />
        <button
          onClick={() => runner.start()}
          disabled={runner.running}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            cursor: runner.running ? "wait" : "pointer",
            background: T.accent,
            color: "#0a1014",
            border: "none",
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            opacity: runner.running ? 0.7 : 1
          }}
        >
          <Icon name="play" size={11} /> {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
  mono
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: T.panel,
        border: `1px solid ${T.border}`,
        minWidth: 110
      }}
    >
      <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          fontFamily: mono ? T.mono : T.sans,
          color: tone ? toneColor(tone) : T.text
        }}
      >
        {value}
        {sub && (
          <span style={{ color: T.dim, fontSize: 13, fontWeight: 400 }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

function Live({ runner }: { runner: AgentRunner }) {
  const { timeline, queue, pulseTick } = runner;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: 16,
        flex: 1,
        minHeight: 0
      }}
    >
      <Panel
        eyebrow="Agent run"
        title="What the assistant did"
        right={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: runner.running ? T.good : T.dim
            }}
          >
            {runner.running && <LiveDot color={T.good} size={6} />}
            {runner.running ? "live" : runner.source === "live" ? "complete" : "idle"}
          </span>
        }
        pad={0}
      >
        <div style={{ padding: "10px 22px 22px" }}>
          {timeline.map((e, i) => (
            <div
              key={`${e.t}-${i}`}
              style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 14, paddingTop: 14 }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 7,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.accent
                  }}
                />
                {i < timeline.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      bottom: -14,
                      left: 9,
                      width: 1,
                      background: T.border
                    }}
                  />
                )}
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    marginBottom: 3
                  }}
                >
                  <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.dim }}>{e.t}</span>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: T.accent,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                      fontWeight: 600
                    }}
                  >
                    {e.kind}
                  </span>
                </div>
                <div style={{ color: T.text, fontSize: 14, lineHeight: 1.5 }}>{e.text}</div>
              </div>
            </div>
          ))}
          {timeline.length === 0 && (
            <div style={{ color: T.faint, fontSize: 13, padding: 12 }}>
              Press <span style={{ color: T.accent }}>Run</span> to start an agent run through OpenShell.
            </div>
          )}
        </div>
      </Panel>
      <Panel
        eyebrow="Continuous monitor"
        title="Recent decisions"
        right={<span style={{ fontSize: 12, color: T.dim }}>{queue.length} items</span>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {queue.map((q, i) => {
            const tone = verdictTone(q.verdict);
            const isActive = q.scenario === runner.scenarioId;
            const isFresh = (pulseTick + i) % 7 === 0;
            return (
              <button
                key={q.id}
                onClick={() => q.scenario && runner.setScenarioId(q.scenario)}
                style={{
                  textAlign: "left",
                  cursor: q.scenario ? "pointer" : "default",
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: isActive ? T.panel2 : "transparent",
                  border: `1px solid ${isActive ? T.borderHi : T.border}`,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 12,
                  color: T.text
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {isFresh && <LiveDot color={T.accent} size={5} />}
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{q.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>{q.meta}</div>
                </div>
                <Pill tone={tone}>{q.verdict}</Pill>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Impact({ runner }: { runner: AgentRunner }) {
  const { scenario } = runner;
  const opLabel = (op: DiffOp): string =>
    op === "+" ? "add" : op === "−" ? "remove" : op === "~" ? "change" : "query";
  const opColor = (op: DiffOp): string =>
    op === "+" ? T.good : op === "−" ? T.bad : op === "~" ? T.warn : T.dim;
  const neighbors = [
    { id: "CHI-N78-041", delta: -2.1 },
    { id: "CHI-N78-043", delta: -1.8 },
    { id: "CHI-N78-055", delta: -1.4 },
    { id: "CHI-N78-039", delta: -0.6 },
    { id: "CHI-N78-040", delta: -0.3 }
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: 16,
        flex: 1,
        minHeight: 0
      }}
    >
      <Panel eyebrow="Diff" title="What this change touches">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scenario.diff.map((d, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr",
                gap: 14,
                padding: "12px 14px",
                borderRadius: 6,
                background: T.bg2,
                border: `1px solid ${T.border}`
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: opColor(d.op),
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontWeight: 600
                }}
              >
                {opLabel(d.op)}
              </span>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 12.5, color: T.dim, marginBottom: 3 }}>
                  {d.path}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 13, color: T.text }}>{d.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        eyebrow="Simulation"
        title="Projected SINR change at neighbors"
        right={<span style={{ fontSize: 12, color: T.dim }}>budget ≤ 0.5 dB</span>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {neighbors.map((n) => {
            const breach = Math.abs(n.delta) > 0.5;
            const w = Math.min(100, Math.abs(n.delta) * 30);
            return (
              <div key={n.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13
                  }}
                >
                  <span style={{ fontFamily: T.mono, color: T.text }}>{n.id}</span>
                  <span style={{ color: breach ? T.bad : T.warn, fontFamily: T.mono }}>
                    {n.delta} dB
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: T.bg2,
                    borderRadius: 100,
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${w}%`,
                      background: breach ? T.bad : T.warn,
                      borderRadius: 100
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function OverrideBanner({ runner }: { runner: AgentRunner }) {
  if (!runner.overrode || !runner.proposed) return null;
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 10,
        background: `${T.warn}15`,
        border: `1px solid ${T.warn}66`,
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap"
      }}
    >
      <Icon name="shield" size={16} />
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 13, color: T.warn, fontWeight: 600, letterSpacing: 0.3 }}>
          Policy Engine overrode the LLM
        </div>
        <div style={{ fontSize: 12.5, color: T.text, marginTop: 4 }}>
          Agent proposed{" "}
          <span style={{ fontFamily: T.mono, color: toneColor(verdictTone(runner.proposed)) }}>
            {runner.proposed}
          </span>
          ; deterministic validator returned{" "}
          <span style={{ fontFamily: T.mono, color: toneColor(verdictTone(runner.decision)) }}>
            {runner.decision}
          </span>
          . The validator's verdict is authoritative.
        </div>
        {runner.proposedRationale && (
          <div
            style={{
              fontSize: 12,
              color: T.dim,
              marginTop: 6,
              fontStyle: "italic"
            }}
          >
            agent rationale: {runner.proposedRationale}
          </div>
        )}
      </div>
    </div>
  );
}

function Policy({ runner }: { runner: AgentRunner }) {
  const { policy, decision, risk } = runner;
  const counts = {
    pass: policy.filter((r) => r.verdict === "pass").length,
    fail: policy.filter((r) => r.verdict === "fail").length,
    skip: policy.filter((r) => r.verdict === "skip").length,
    pending: policy.filter((r) => r.verdict === "pending").length
  };
  return (
    <>
      <OverrideBanner runner={runner} />
      <Panel
        eyebrow="Policy engine"
        title="Rules evaluated against this change"
        right={
          <span style={{ display: "flex", gap: 10, fontSize: 12, color: T.dim }}>
            <span style={{ color: T.good }}>{counts.pass} pass</span>
            <span style={{ color: T.bad }}>{counts.fail} fail</span>
            <span>{counts.skip} skip</span>
            {counts.pending > 0 && <span style={{ color: T.warn }}>{counts.pending} pending</span>}
          </span>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {policy.map((r) => {
            const tone = verdictTone(r.verdict);
            const c = toneColor(tone);
            return (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px 1fr 110px",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "14px 16px",
                  borderRadius: 6,
                  background: T.bg2,
                  border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${c}`
                }}
              >
                <span
                  style={{
                    fontFamily: T.mono,
                    fontSize: 12,
                    color: T.dim,
                    paddingTop: 2
                  }}
                >
                  {r.id}
                </span>
                <div>
                  <div style={{ fontSize: 14, color: T.text, marginBottom: 4 }}>{r.name}</div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: T.dim,
                      fontFamily: T.mono,
                      lineHeight: 1.5
                    }}
                  >
                    {r.input}
                  </div>
                </div>
                <Pill tone={tone}>{r.verdict}</Pill>
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 10,
            background: T.panel2,
            border: `1px solid ${T.borderHi}`,
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap"
          }}
        >
          <span style={{ color: T.dim, fontSize: 12 }}>Engine output</span>
          <Pill tone={verdictTone(decision)}>{decision}</Pill>
          <span style={{ fontSize: 13, color: T.dim }}>risk score</span>
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 16,
              fontWeight: 600,
              color: risk >= 60 ? T.bad : risk >= 40 ? T.warn : T.good
            }}
          >
            {risk}/100
          </span>
        </div>
      </Panel>
    </>
  );
}

function Shell({ runner }: { runner: AgentRunner }) {
  const { shell } = runner;
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <Panel
      eyebrow="OpenShell"
      title="Commands the agent ran in the sandbox"
      right={
        <span style={{ fontSize: 12, color: T.dim }}>
          {shell.length} command{shell.length === 1 ? "" : "s"}
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shell.map((c, i) => {
          const tone: Tone = c.status === "denied" ? "bad" : c.status === "warn" ? "warn" : "good";
          const isOpen = !!open[i];
          const rowStyle: CSSProperties = {
            width: "100%",
            display: "grid",
            gridTemplateColumns: "20px 1fr auto auto auto",
            gap: 12,
            alignItems: "center",
            padding: "12px 16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: T.text,
            textAlign: "left"
          };
          return (
            <div
              key={i}
              style={{
                borderRadius: 6,
                background: T.bg2,
                border: `1px solid ${T.border}`,
                overflow: "hidden"
              }}
            >
              <button onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} style={rowStyle}>
                <span
                  style={{
                    color: T.dim,
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform .15s",
                    display: "inline-flex"
                  }}
                >
                  <Icon name="chev" size={12} />
                </span>
                <code
                  style={{
                    fontFamily: T.mono,
                    fontSize: 12.5,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  <span style={{ color: T.accent }}>$</span> {c.cmd}
                </code>
                <span style={{ fontSize: 12, color: T.dim, fontFamily: T.mono }}>{fmtMs(c.dur)}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: c.code === 0 ? T.dim : T.bad,
                    fontFamily: T.mono
                  }}
                >
                  exit {c.code}
                </span>
                <Pill tone={tone}>{c.status}</Pill>
              </button>
              {isOpen && (
                <pre
                  style={{
                    margin: 0,
                    padding: "12px 18px 16px 50px",
                    fontFamily: T.mono,
                    fontSize: 12.5,
                    color: c.status === "denied" ? T.bad : T.dim,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    borderTop: `1px solid ${T.border}`
                  }}
                >
                  {c.out}
                </pre>
              )}
            </div>
          );
        })}
        {shell.length === 0 && (
          <div style={{ color: T.faint, fontSize: 13, padding: 12 }}>
            No commands executed yet. Press <span style={{ color: T.accent }}>Run</span> to start.
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 10,
          background: T.bg,
          border: `1px solid ${T.border}`,
          fontSize: 12.5,
          color: T.dim
        }}
      >
        <div style={{ marginBottom: 4, color: T.text, fontWeight: 500 }}>
          OpenShell network policy (policies/ran-drift-demo.yaml)
        </div>
        <span style={{ color: T.good }}>allow: inference.local, integrate.api.nvidia.com, rag.internal</span>
        <span style={{ color: T.faint }}> · </span>
        <span style={{ color: T.bad }}>default-deny: prod-oss.internal, *.nms.*, vendor.example.com</span>
      </div>
    </Panel>
  );
}

function Rag({ runner }: { runner: AgentRunner }) {
  const { rag } = runner;
  const [sel, setSel] = useState(0);
  const cur = rag[sel] ?? rag[0];
  if (!cur) {
    return (
      <Panel eyebrow="Citations" title="Internal RAG matches">
        <div style={{ color: T.faint, fontSize: 13, padding: 12 }}>
          No evidence retrieved yet. Press <span style={{ color: T.accent }}>Run</span> to start.
        </div>
      </Panel>
    );
  }
  const parts = cur.body.split(cur.highlight);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 16,
        flex: 1,
        minHeight: 0
      }}
    >
      <Panel eyebrow="Citations" title="Internal RAG matches" pad={10}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rag.map((c, i) => {
            const active = i === sel;
            return (
              <button
                key={`${c.id}-${i}`}
                onClick={() => setSel(i)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "12px 12px",
                  borderRadius: 8,
                  background: active ? T.panel2 : "transparent",
                  border: `1px solid ${active ? T.borderHi : "transparent"}`,
                  color: T.text
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.accent }}>{c.id}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.dim }}>
                    {c.sim.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: T.text, marginBottom: 6 }}>{c.section}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {c.used.map((u) => (
                    <Pill key={u} tone="muted" soft>
                      {u}
                    </Pill>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel
        eyebrow={cur.id}
        title={cur.section}
        right={<span style={{ fontSize: 12, color: T.dim }}>internal · scoped</span>}
      >
        <div style={{ maxWidth: 720, fontSize: 14.5, lineHeight: 1.75, color: T.text }}>
          <p style={{ margin: 0 }}>
            {parts[0]}
            <mark
              style={{
                background: `${T.accent}33`,
                color: T.text,
                padding: "2px 4px",
                borderRadius: 3
              }}
            >
              {cur.highlight}
            </mark>
            {parts[1]}
          </p>
          <div
            style={{
              marginTop: 22,
              padding: 14,
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              fontSize: 12.5,
              color: T.dim,
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 18px"
            }}
          >
            <span>
              <span style={{ color: T.faint }}>cited by</span>{" "}
              <span style={{ color: T.text, fontFamily: T.mono }}>{cur.used.join(", ")}</span>
            </span>
            <span>
              <span style={{ color: T.faint }}>similarity</span>{" "}
              <span style={{ color: T.text, fontFamily: T.mono }}>{cur.sim.toFixed(3)}</span>
            </span>
            <span>
              <span style={{ color: T.faint }}>source</span>{" "}
              <span style={{ color: T.text, fontFamily: T.mono }}>
                ran-rag/internal/{cur.id.toLowerCase()}.md
              </span>
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Audit({ runner }: { runner: AgentRunner }) {
  const { audit, scenario, decision, risk, recommendation } = runner;
  const auditJson = `{
  "change": "${scenario.chg}",
  "site": "${scenario.site}",
  "verdict": "${decision}",
  "risk": ${risk},
  "rules": ${runner.policy.length},
  "rag_chunks": ${runner.rag.length},
  "signed_by": "sandbox-key/3f:a1:c2:..."
}`;
  return (
    <Panel
      eyebrow="Audit trail"
      title="Signed, append-only, exportable"
      right={
        <span style={{ fontSize: 12, color: T.dim, fontFamily: T.mono }}>
          fingerprint 3f:a1:c2…
        </span>
      }
    >
      <div style={{ position: "relative" }}>
        {audit.map((e, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "90px 12px 1fr",
              gap: 14,
              padding: "10px 0",
              alignItems: "center"
            }}
          >
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.dim }}>{e.t}</span>
            <div style={{ position: "relative", height: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 4,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: T.accent
                }}
              />
              {i < audit.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    bottom: -10,
                    left: 5,
                    width: 1,
                    background: T.border
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: T.mono, fontSize: 13, color: T.accent }}>{e.actor}</span>
              <span style={{ fontSize: 13.5, color: T.text }}>{e.summary}</span>
            </div>
          </div>
        ))}
        {audit.length === 0 && (
          <div style={{ color: T.faint, fontSize: 13, padding: 12 }}>
            No audit entries yet.
          </div>
        )}
      </div>
      {recommendation && (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 10,
            background: T.panel2,
            border: `1px solid ${T.borderHi}`
          }}
        >
          <div style={{ fontSize: 11, color: T.dim, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>
            Recommendation
          </div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>{recommendation}</div>
        </div>
      )}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 10,
          background: T.bg2,
          border: `1px solid ${T.border}`
        }}
      >
        <div style={{ color: T.text, marginBottom: 8, fontFamily: T.mono, fontSize: 12.5 }}>
          {`audit/${scenario.chg.toLowerCase()}.json`}
        </div>
        <pre
          style={{
            margin: 0,
            fontFamily: T.mono,
            fontSize: 12.5,
            color: T.dim,
            lineHeight: 1.6
          }}
        >
          {auditJson}
        </pre>
      </div>
    </Panel>
  );
}

function Diagnostics({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`${liveApiBase}/api/live/status`)
      .then((r) => r.json())
      .then((s: LiveStatus) => {
        if (!cancelled) {
          setStatus(s);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Live bridge is not reachable.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const rows = useMemo<Array<[string, string, Tone]>>(() => {
    if (!status) {
      return [
        [".env", "—", "muted"],
        ["NVIDIA key", "—", "muted"],
        ["Docker", "—", "muted"],
        ["OpenShell", "—", "muted"],
        ["Sandbox", "—", "muted"],
        ["Mode", "—", "muted"]
      ];
    }
    return [
      [".env", status.envFilePresent ? "Present" : "Missing", status.envFilePresent ? "good" : "bad"],
      [
        "NVIDIA key",
        status.nvidiaApiKeyPresent ? "Present" : "Missing",
        status.nvidiaApiKeyPresent ? "good" : "bad"
      ],
      ["Docker", status.dockerReachable ? "Ready" : "Missing", status.dockerReachable ? "good" : "bad"],
      ["OpenShell CLI", status.openshellPresent ? "Ready" : "Missing", status.openshellPresent ? "good" : "warn"],
      ["Sandbox", status.sandboxPresent ? status.sandboxName : "Missing", status.sandboxPresent ? "good" : "warn"],
      ["Mode", status.mode, status.mode === "sandbox" ? "good" : "warn"]
    ];
  }, [status]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 20,
        display: "flex",
        justifyContent: "flex-end"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          height: "100%",
          background: T.panel,
          borderLeft: `1px solid ${T.borderHi}`,
          padding: 26,
          overflow: "auto",
          color: T.text
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Icon name="gear" size={14} />
          <span
            style={{
              fontSize: 11,
              color: T.dim,
              letterSpacing: 0.6,
              textTransform: "uppercase"
            }}
          >
            Sandbox diagnostics
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.dim,
              padding: 6,
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            <Icon name="x" size={12} />
          </button>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 600 }}>OpenShell runtime</h3>
        <p style={{ margin: "0 0 22px", color: T.dim, fontSize: 13.5, lineHeight: 1.55 }}>
          The host bridge dispatches each scenario into the OpenShell sandbox via{" "}
          <code style={{ fontFamily: T.mono }}>openshell sandbox exec</code>. In dev mode the runner spawns directly on the host and the OpenShell layer is not enforcing.
        </p>
        {error && (
          <p style={{ color: T.bad, fontSize: 13, marginBottom: 14 }}>
            {error} Start it with <code style={{ fontFamily: T.mono }}>npm run dev:bridge</code>.
          </p>
        )}
        {rows.map(([k, v, t]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: `1px solid ${T.border}`
            }}
          >
            <span style={{ fontSize: 13, color: T.text }}>{k}</span>
            <Pill tone={t}>{v}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}
