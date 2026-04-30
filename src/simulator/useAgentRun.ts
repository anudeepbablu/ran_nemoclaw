import { useCallback, useEffect, useReducer } from "react";
import { queueItems, scenarios } from "../data/fixtures";
import type {
  AuditEntry,
  Decision,
  PolicyRule,
  QueueItem,
  RagChunk,
  RunMode,
  Scenario,
  ScenarioId,
  ShellCommand,
  TimelineEvent,
  WireEvent
} from "../types";

const liveApiBase = import.meta.env.VITE_LIVE_API_BASE || "http://localhost:8787";

export type BridgeStatus = "disconnected" | "connected" | "error";
export type RunSource = "live" | "static";

type LiveState = {
  runId: string | null;
  mode: RunMode | null;
  running: boolean;
  timeline: TimelineEvent[];
  shell: ShellCommand[];
  rag: RagChunk[];
  policy: PolicyRule[];
  audit: AuditEntry[];
  proposed: Decision | null;
  proposedRationale: string | null;
  verdict: Decision | null;
  overrode: boolean;
  risk: number | null;
  recommendation: string | null;
  warnings: string[];
};

const emptyLive = (): LiveState => ({
  runId: null,
  mode: null,
  running: false,
  timeline: [],
  shell: [],
  rag: [],
  policy: [],
  audit: [],
  proposed: null,
  proposedRationale: null,
  verdict: null,
  overrode: false,
  risk: null,
  recommendation: null,
  warnings: []
});

type State = {
  scenarioId: ScenarioId;
  bridgeStatus: BridgeStatus;
  live: Partial<Record<ScenarioId, LiveState>>;
  scenarioByRunId: Record<string, ScenarioId>;
  pulseTick: number;
  startError: string | null;
};

type Action =
  | { type: "set-scenario"; id: ScenarioId }
  | { type: "bridge"; status: BridgeStatus }
  | { type: "wire"; event: WireEvent }
  | { type: "tick" }
  | { type: "start-error"; message: string | null };

function init(initialId: ScenarioId): State {
  return {
    scenarioId: initialId,
    bridgeStatus: "disconnected",
    live: {},
    scenarioByRunId: {},
    pulseTick: 0,
    startError: null
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-scenario":
      return { ...state, scenarioId: action.id };
    case "bridge":
      return { ...state, bridgeStatus: action.status };
    case "tick":
      return { ...state, pulseTick: state.pulseTick + 1 };
    case "start-error":
      return { ...state, startError: action.message };
    case "wire":
      return applyWire(state, action.event);
    default:
      return state;
  }
}

function applyWire(state: State, event: WireEvent): State {
  if (event.kind === "bridge.connected") {
    return { ...state, bridgeStatus: "connected" };
  }
  if (event.kind === "run.dispatched") {
    return {
      ...state,
      scenarioByRunId: { ...state.scenarioByRunId, [event.runId]: event.scenarioId },
      live: {
        ...state.live,
        [event.scenarioId]: {
          ...emptyLive(),
          runId: event.runId,
          mode: event.mode,
          running: true
        }
      }
    };
  }
  const runId = "runId" in event ? event.runId : null;
  if (!runId) return state;
  const sid = state.scenarioByRunId[runId];
  if (!sid) return state;
  const current = state.live[sid] || emptyLive();
  const next = applyToScenario(current, event);
  return {
    ...state,
    live: { ...state.live, [sid]: next }
  };
}

function applyToScenario(cur: LiveState, event: WireEvent): LiveState {
  switch (event.kind) {
    case "run.started":
      return { ...cur, running: true, mode: event.mode ?? cur.mode };
    case "timeline":
      return { ...cur, timeline: [...cur.timeline, event.event] };
    case "shell":
      return { ...cur, shell: [...cur.shell, event.command] };
    case "rag":
      return { ...cur, rag: [...cur.rag, event.chunk] };
    case "policy":
      return { ...cur, policy: [...cur.policy, event.rule] };
    case "audit":
      return { ...cur, audit: [...cur.audit, event.entry] };
    case "policy.proposal":
      return { ...cur, proposed: event.decision, proposedRationale: event.rationale };
    case "policy.verdict":
      return {
        ...cur,
        proposed: event.proposed,
        verdict: event.decision,
        overrode: event.overrode,
        risk: event.risk
      };
    case "recommendation":
      return { ...cur, recommendation: event.text };
    case "run.complete":
      return { ...cur, running: false, verdict: event.verdict ?? cur.verdict };
    case "run.error":
    case "run.warning":
      return { ...cur, warnings: [...cur.warnings, event.message] };
    case "run.exit":
      return { ...cur, running: false };
    default:
      return cur;
  }
}

function synthesizeAudit(scenario: Scenario): AuditEntry[] {
  const find = (kind: string) => scenario.timeline.find((e) => e.kind === kind)?.t;
  const out: AuditEntry[] = [
    { t: scenario.timeline[0]?.t || "—", actor: "NemoClaw", summary: `${scenario.chg} entered staging queue` }
  ];
  const rag = find("rag");
  if (rag) out.push({ t: rag, actor: "RAG", summary: `Retrieved ${scenario.rag.length} internal RAG chunks` });
  const policy = find("policy");
  if (policy) out.push({ t: policy, actor: "Policy Engine", summary: `${scenario.rules.length} rules · risk ${scenario.risk}/100` });
  const guard = find("guard");
  if (guard) out.push({ t: guard, actor: "OpenShell", summary: "sandbox boundary held" });
  const decision = find("decision");
  if (decision) out.push({ t: decision, actor: "Policy Engine", summary: `verdict = ${scenario.decision}` });
  const audit = find("audit");
  if (audit) out.push({ t: audit, actor: "NemoClaw", summary: `audit/${scenario.chg.toLowerCase()}.json` });
  return out;
}

export type AgentRunner = {
  scenarios: Scenario[];
  scenario: Scenario;
  scenarioId: ScenarioId;
  setScenarioId: (id: ScenarioId) => void;
  queue: QueueItem[];
  pulseTick: number;

  bridgeStatus: BridgeStatus;
  mode: RunMode | null;
  source: RunSource;
  running: boolean;
  start: () => Promise<void>;
  startError: string | null;
  warnings: string[];

  timeline: TimelineEvent[];
  shell: ShellCommand[];
  rag: RagChunk[];
  policy: PolicyRule[];
  audit: AuditEntry[];
  recommendation: string | null;

  decision: Decision;
  proposed: Decision | null;
  proposedRationale: string | null;
  overrode: boolean;
  risk: number;
};

export function useAgentRun(initialScenarioId: ScenarioId): AgentRunner {
  const [state, dispatch] = useReducer(reducer, initialScenarioId, init);

  useEffect(() => {
    const source = new EventSource(`${liveApiBase}/api/events`);
    source.onopen = () => dispatch({ type: "bridge", status: "connected" });
    source.onerror = () => dispatch({ type: "bridge", status: "error" });
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WireEvent;
        dispatch({ type: "wire", event });
      } catch {
        /* drop */
      }
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "tick" }), 2400);
    return () => window.clearInterval(id);
  }, []);

  const scenario = scenarios.find((s) => s.id === state.scenarioId) ?? scenarios[0];
  const live = state.live[scenario.id];

  const hasLive = Boolean(
    live &&
      (live.timeline.length > 0 ||
        live.shell.length > 0 ||
        live.policy.length > 0 ||
        live.rag.length > 0)
  );
  const source: RunSource = hasLive ? "live" : "static";

  const start = useCallback(async () => {
    try {
      const response = await fetch(`${liveApiBase}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        dispatch({ type: "start-error", message: body.error || `bridge replied ${response.status}` });
        return;
      }
      dispatch({ type: "start-error", message: null });
    } catch (err) {
      dispatch({
        type: "start-error",
        message: err instanceof Error ? err.message : "bridge unreachable"
      });
    }
  }, [scenario.id]);

  const setScenarioId = useCallback((id: ScenarioId) => {
    dispatch({ type: "set-scenario", id });
  }, []);

  return {
    scenarios,
    scenario,
    scenarioId: scenario.id,
    setScenarioId,
    queue: queueItems,
    pulseTick: state.pulseTick,

    bridgeStatus: state.bridgeStatus,
    mode: live?.mode ?? null,
    source,
    running: live?.running ?? false,
    start,
    startError: state.startError,
    warnings: live?.warnings ?? [],

    timeline: source === "live" ? live!.timeline : scenario.timeline,
    shell: source === "live" ? live!.shell : scenario.openshell,
    rag: source === "live" ? live!.rag : scenario.rag,
    policy: source === "live" ? live!.policy : scenario.rules,
    audit: source === "live" ? live!.audit : synthesizeAudit(scenario),
    recommendation: live?.recommendation ?? null,

    decision: live?.verdict ?? scenario.decision,
    proposed: live?.proposed ?? null,
    proposedRationale: live?.proposedRationale ?? null,
    overrode: live?.overrode ?? false,
    risk: live?.risk ?? scenario.risk
  };
}
