#!/usr/bin/env node
// In-sandbox agent runner.
//
// Executes the agent for one scenario, emitting AgentEvents as NDJSON on
// stdout. The host-side bridge spawns this via `openshell sandbox exec`
// and relays each line as an SSE event to the browser.
//
// PR 2a: scripted dispatch from server/agent/scripts.mjs.
// PR 2b: switches to server/agent/agent-loop.mjs (Nemotron tool-calling)
//        when OpenShell inference is configured.

import { scenarios } from "../data/fixtures.js";
import { scripts } from "./scripts.mjs";
import { toolRegistry } from "./tools.mjs";

const args = parseArgs(process.argv.slice(2));
const scenarioId = args.scenario || args.s;
if (!scenarioId) {
  fatal("missing --scenario <id>");
}

const scenario = scenarios.find((s) => s.id === scenarioId);
if (!scenario) {
  fatal(`unknown scenario: ${scenarioId}`);
}

const script = scripts[scenarioId];
if (!script) {
  fatal(`no scripted plan for scenario: ${scenarioId}`);
}

const runId = `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

emit({ kind: "run.started", runId, scenarioId, t: now() });

try {
  await runScripted();
} catch (err) {
  emit({
    kind: "run.error",
    runId,
    message: err instanceof Error ? err.message : String(err),
    t: now()
  });
  process.exit(1);
}

// ─── execution ────────────────────────────────────────────────────────────

async function runScripted() {
  let lastVerdict = null;

  for (const step of script) {
    const tool = toolRegistry[step.tool];
    if (!tool) {
      throw new Error(`runner: unknown tool ${step.tool}`);
    }

    // Some tools need the validator's verdict from a prior step
    // (e.g. applyChange must see verdict=Allowed). The script can opt in
    // with `verdictFromContext: true`.
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

  emit({
    kind: "run.complete",
    runId,
    verdict: lastVerdict ?? "Denied",
    t: now()
  });
}

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
    // Emit one policy event per rule. The Policy tab in the UI populates
    // from these. Rules come from the scenario fixture (the validation
    // CLI returns aggregate counts only).
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
