#!/usr/bin/env node
// In-sandbox agent runner.
//
// Executes the agent for one scenario, emitting AgentEvents as NDJSON on
// stdout. The host-side bridge spawns this via `openshell sandbox exec`
// and relays each line as an SSE event to the browser.
//
// Modes:
//   --mode scripted   deterministic dispatch from server/agent/scripts.mjs
//   --mode llm        Nemotron tool-calling loop via server/agent/agent-loop.mjs
//   --mode auto       (default) llm if NVIDIA_API_KEY is set, else scripted
//
// LLM mode requires either OpenShell's inference proxy (inside the sandbox,
// where credentials are injected by the gateway) or a direct
// integrate.api.nvidia.com base URL plus NVIDIA_API_KEY in env.

import { runLLM } from "./agent-loop.mjs";
import { scenarios } from "../data/fixtures.js";
import { scripts } from "./scripts.mjs";
import { toolRegistry } from "./tools.mjs";

const args = parseArgs(process.argv.slice(2));
const scenarioId = args.scenario || args.s;
const requestedMode = args.mode || "auto";

if (!scenarioId) fatal("missing --scenario <id>");
if (!["scripted", "llm", "auto"].includes(requestedMode)) {
  fatal(`invalid --mode: ${requestedMode} (expected scripted | llm | auto)`);
}

const scenario = scenarios.find((s) => s.id === scenarioId);
if (!scenario) fatal(`unknown scenario: ${scenarioId}`);

const mode = resolveMode(requestedMode);
const runId = `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

emit({ kind: "run.started", runId, scenarioId, mode, t: now() });

try {
  const verdict =
    mode === "llm"
      ? await runLlmMode()
      : await runScriptedMode();

  emit({
    kind: "run.complete",
    runId,
    verdict: verdict ?? "Denied",
    t: now()
  });
} catch (err) {
  emit({
    kind: "run.error",
    runId,
    message: err instanceof Error ? err.message : String(err),
    t: now()
  });
  process.exit(1);
}

// ─── mode dispatch ────────────────────────────────────────────────────────

function resolveMode(requested) {
  if (requested === "scripted" || requested === "llm") return requested;
  // auto: prefer LLM when an API key is available, else scripted.
  return process.env.NVIDIA_API_KEY ? "llm" : "scripted";
}

async function runScriptedMode() {
  const script = scripts[scenarioId];
  if (!script) throw new Error(`no scripted plan for ${scenarioId}`);

  let lastVerdict = null;

  for (const step of script) {
    const tool = toolRegistry[step.tool];
    if (!tool) throw new Error(`runner: unknown tool ${step.tool}`);

    const args = { ...step.args };
    if (args.verdictFromContext) {
      delete args.verdictFromContext;
      args.verdict = lastVerdict ?? "Denied";
    }

    const result = await tool(args);
    emitForResult(step.tool, result);

    if (step.tool === "proposePolicyDecision" && result.ok) {
      lastVerdict = result.verdict;
    }

    if (step.narrate) {
      emit({
        kind: "timeline",
        runId,
        event: { t: now(), kind: step.narrate.kind, text: step.narrate.text }
      });
    }
  }

  return lastVerdict;
}

async function runLlmMode() {
  try {
    const { verdict, finalized } = await runLLM({
      scenario,
      emit,
      emitForResult
    });
    if (!finalized) {
      emit({
        kind: "run.warning",
        runId,
        message:
          "LLM run ended without calling finalizeRecommendation; verdict from latest proposal.",
        t: now()
      });
    }
    return verdict;
  } catch (err) {
    // LLM unreachable / auth failure / etc. Surface and fall back to
    // scripted so the demo doesn't dead-end on a flaky network.
    emit({
      kind: "run.warning",
      runId,
      message: `LLM mode failed (${err instanceof Error ? err.message : String(err)}); falling back to scripted dispatch.`,
      t: now()
    });
    return runScriptedMode();
  }
}

// ─── event emission ───────────────────────────────────────────────────────

function emitForResult(toolName, result) {
  if (!result) return;

  if (Array.isArray(result.shell)) {
    for (const cmd of result.shell) {
      emit({ kind: "shell", runId, command: cmd });
    }
  }

  if (Array.isArray(result.rag)) {
    for (const chunk of result.rag) {
      emit({ kind: "rag", runId, chunk });
    }
  }

  if (Array.isArray(result.audit)) {
    for (const entry of result.audit) {
      emit({ kind: "audit", runId, entry });
    }
  }

  if (toolName === "runValidationTests" && result.ok) {
    for (const rule of scenario.rules) {
      emit({ kind: "policy", runId, rule });
    }
  }

  if (toolName === "proposePolicyDecision" && result.ok) {
    emit({
      kind: "policy.proposal",
      runId,
      decision: result.proposed,
      rationale: result.rationale,
      t: now()
    });
    emit({
      kind: "policy.verdict",
      runId,
      decision: result.verdict,
      proposed: result.proposed,
      overrode: result.overrode,
      risk: result.risk,
      t: now()
    });
  }

  if (toolName === "finalizeRecommendation" && result.ok) {
    emit({
      kind: "recommendation",
      runId,
      text: result.recommendation,
      t: now()
    });
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n");
}

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fatal(message) {
  process.stderr.write(`runner: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else if (a.startsWith("-")) {
      const key = a.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}
