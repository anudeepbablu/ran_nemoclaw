// Tool surface for the in-sandbox agent runner.
//
// Five OpenShell-routed tools spawn scripts/openshell/*.js (or curl) as
// subprocesses; when running inside the OpenShell sandbox, the
// process/network/FS layers govern those spawns. Four pure-TS tools
// operate in-process against the mounted fixtures.
//
// Each tool returns a structured result:
//   { shell?: ShellCommand[],         // OpenShell-routed records to emit
//     rag?: RagChunk[],               // RAG matches to emit
//     audit?: { actor, summary }[],   // audit entries to emit
//     verdict?: Decision,             // proposePolicyDecision output
//     proposed?: Decision,            //   ↳ LLM's proposal
//     overrode?: boolean,             //   ↳ validator disagreed?
//     risk?: number,                  //   ↳ risk score
//     recommendation?: string,        // finalizeRecommendation output
//     ok: boolean,
//     error?: string }
//
// The runner unpacks this into AgentEvents and emits NDJSON on stdout.

import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { scenarios } from "../data/fixtures.js";
import { validate } from "./policy.js";

const execFileP = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const sims = (name) => join(repoRoot, "scripts", "openshell", name);

const TOOL_TIMEOUT_MS = Number(process.env.OPENSHELL_TOOL_TIMEOUT_MS || 8000);

function nowHM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Spawns a child with a hard timeout. On timeout (or any non-zero exit
// when `allowFailure` is true) returns a structured result instead of
// throwing. `timedOut` flags the timeout case so callers can render
// "tool timed out after Xms" in the OpenShell transcript.
async function spawnTimed(
  cmd,
  args,
  { allowFailure = false, timeoutMs = TOOL_TIMEOUT_MS } = {}
) {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execFileP(cmd, args, {
      maxBuffer: 4 * 1024 * 1024,
      timeout: timeoutMs,
      killSignal: "SIGTERM"
    });
    return {
      code: 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      dur: Date.now() - start,
      timedOut: false
    };
  } catch (err) {
    const dur = Date.now() - start;
    const timedOut = Boolean(err.killed) && err.signal === "SIGTERM";
    if (!allowFailure) {
      err.dur = dur;
      err.timedOut = timedOut;
      throw err;
    }
    return {
      code: timedOut ? 124 : typeof err.code === "number" ? err.code : 1,
      stdout: (err.stdout || "").trim(),
      stderr: timedOut
        ? `tool timed out after ${timeoutMs}ms`
        : (err.stderr || err.message || "").trim(),
      dur,
      timedOut
    };
  }
}

// ─── OpenShell-routed tools ────────────────────────────────────────────────

export async function inspectConfigChange({ changeId }) {
  const r = await spawnTimed("node", [sims("inspect-config.js"), "--change", changeId], {
    allowFailure: true
  });
  return {
    ok: r.code === 0,
    shell: [
      {
        cmd: `node scripts/openshell/inspect-config.js --change ${changeId}`,
        dur: r.dur,
        status: r.code === 0 ? "ok" : "denied",
        code: r.code,
        out: r.stdout || r.stderr
      }
    ]
  };
}

export async function runValidationTests({ changeId }) {
  const r = await spawnTimed(
    "node",
    [sims("validate-change.js"), "--change", changeId],
    { allowFailure: true }
  );
  return {
    ok: r.code === 0,
    shell: [
      {
        cmd: `node scripts/openshell/validate-change.js --change ${changeId}`,
        dur: r.dur,
        status: r.code === 0 ? "ok" : "denied",
        code: r.code,
        out: r.stdout || r.stderr
      }
    ]
  };
}

// Tries production OSS first; the OpenShell network policy denies
// prod-oss.internal by default, so we expect a denial. Outside the sandbox
// the call still fails (DNS / connection refused) which we map to the same
// shape so the demo works either way.
export async function queryInventory({ siteId }) {
  const probe = await spawnTimed(
    "curl",
    ["-sSf", "--max-time", "5", `https://prod-oss.internal/cell-sites/${siteId}`],
    { allowFailure: true }
  );
  const probeRecord = {
    cmd: `curl https://prod-oss.internal/cell-sites/${siteId}`,
    dur: probe.dur,
    status: "denied",
    code: probe.code === 0 ? 1 : probe.code,
    out:
      probe.stderr.includes("policy_denied") || probe.stderr.includes("403")
        ? `sandbox boundary: production OSS read refused\nreason: P-040 production OSS reach blocked`
        : probe.stderr ||
          "sandbox boundary: production OSS read refused\nreason: P-040 production OSS reach blocked"
  };

  const fb = await spawnTimed(
    "node",
    [sims("sim-inventory.js"), "--site", siteId],
    { allowFailure: true }
  );
  const fallbackRecord = {
    cmd: `node scripts/openshell/sim-inventory.js --site ${siteId}`,
    dur: fb.dur,
    status: fb.code === 0 ? "ok" : "denied",
    code: fb.code,
    out: fb.stdout || fb.stderr
  };

  return { ok: fb.code === 0, shell: [probeRecord, fallbackRecord] };
}

// Vendor schema fetch is expected to require approval. The OpenShell policy
// has no allow rule for vendor.example.com, so the proxy denies. The demo
// reports this as approval-required (a host-side concept) rather than a
// pure deny.
export async function fetchVendorSchema({ band }) {
  const r = await spawnTimed(
    "curl",
    ["-sSf", "--max-time", "5", `https://vendor.example.com/schema/${band}.json`],
    { allowFailure: true }
  );
  return {
    ok: false,
    shell: [
      {
        cmd: `curl https://vendor.example.com/schema/${band}.json`,
        dur: r.dur,
        status: "warn",
        code: 1,
        out:
          r.stderr.includes("policy_denied") || r.stderr.includes("403")
            ? "approval-required: vendor egress requires operator approval"
            : "approval-required: vendor egress requires operator approval (dev-mode synthetic)"
      }
    ]
  };
}

// Apply only on Allowed verdict. The runner is responsible for guarding;
// this tool double-checks via an explicit verdict argument so a bug in the
// runner can't flip a Denied change into the apply path.
export async function applyChange({ changeId, verdict }) {
  if (verdict !== "Allowed") {
    return {
      ok: false,
      error: `applyChange refused: verdict=${verdict}, requires Allowed`,
      shell: [
        {
          cmd: `apply-change refused (verdict=${verdict})`,
          dur: 0,
          status: "denied",
          code: 13,
          out: "apply gate: validator did not approve this change"
        }
      ]
    };
  }
  const r = await spawnTimed(
    "node",
    [sims("apply-change.js"), "--change", changeId],
    { allowFailure: true }
  );
  return {
    ok: r.code === 0,
    shell: [
      {
        cmd: `node scripts/openshell/apply-change.js --change ${changeId}`,
        dur: r.dur,
        status: r.code === 0 ? "ok" : "denied",
        code: r.code,
        out: r.stdout || r.stderr
      }
    ]
  };
}

// ─── Pure-TS tools ────────────────────────────────────────────────────────

export function searchRagCorpus({ scenarioId, query }) {
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    return { ok: false, error: `unknown scenario ${scenarioId}` };
  }
  const q = (query || "").toLowerCase();
  const ranked = scenario.rag
    .map((chunk) => ({
      chunk,
      score:
        chunk.sim +
        (q && chunk.body.toLowerCase().includes(q) ? 0.05 : 0) +
        (q && chunk.section.toLowerCase().includes(q) ? 0.03 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.chunk);

  return { ok: true, rag: ranked };
}

// Records the LLM's proposed decision, runs the deterministic validator,
// reports whether the validator overrode the proposal. The validator's
// answer is authoritative.
export function proposePolicyDecision({ scenarioId, proposed, rationale }) {
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario) {
    return { ok: false, error: `unknown scenario ${scenarioId}` };
  }
  const final = validate(scenario.rules);
  return {
    ok: true,
    proposed,
    verdict: final,
    overrode: proposed !== final,
    risk: scenario.risk,
    rationale: rationale || "",
    rules: scenario.rules
  };
}

export function recordAudit({ actor, summary }) {
  return {
    ok: true,
    audit: [{ actor, summary, t: nowHM() }]
  };
}

export function finalizeRecommendation({ text }) {
  return { ok: true, recommendation: text };
}

// ─── Tool registry (used by PR 2b's LLM dispatcher) ───────────────────────

export const toolRegistry = {
  inspectConfigChange,
  runValidationTests,
  queryInventory,
  fetchVendorSchema,
  applyChange,
  searchRagCorpus,
  proposePolicyDecision,
  recordAudit,
  finalizeRecommendation
};

// Function-calling schemas. Used by PR 2b's Nemotron tool-calling loop.
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "inspectConfigChange",
      description:
        "Parse a proposed RAN config change and return its descriptor (site, vendor, band, ops). Runs through OpenShell.",
      parameters: {
        type: "object",
        properties: { changeId: { type: "string" } },
        required: ["changeId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "runValidationTests",
      description:
        "Run the policy/validation suite against a change. Returns per-rule verdicts, risk score, and the validator's verdict. Runs through OpenShell.",
      parameters: {
        type: "object",
        properties: { changeId: { type: "string" } },
        required: ["changeId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "queryInventory",
      description:
        "Look up cell state for a site. Tries production OSS first (denied by sandbox boundary) then falls back to the synthetic inventory simulator.",
      parameters: {
        type: "object",
        properties: { siteId: { type: "string" } },
        required: ["siteId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fetchVendorSchema",
      description:
        "Attempt to fetch an external vendor schema. Sandbox network policy requires operator approval; the call is reported as approval-required.",
      parameters: {
        type: "object",
        properties: { band: { type: "string" } },
        required: ["band"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "applyChange",
      description:
        "Apply an approved change to the synthetic config store. Refuses unless verdict=Allowed.",
      parameters: {
        type: "object",
        properties: {
          changeId: { type: "string" },
          verdict: { type: "string", enum: ["Allowed", "Denied", "Approval"] }
        },
        required: ["changeId", "verdict"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchRagCorpus",
      description:
        "Search the internal RAN engineering RAG corpus for relevant policy/runbook chunks.",
      parameters: {
        type: "object",
        properties: {
          scenarioId: { type: "string" },
          query: { type: "string" }
        },
        required: ["scenarioId", "query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "proposePolicyDecision",
      description:
        "Submit your proposed verdict (Allowed/Denied/Approval) with rationale. The deterministic Policy Engine validates and may override.",
      parameters: {
        type: "object",
        properties: {
          scenarioId: { type: "string" },
          proposed: { type: "string", enum: ["Allowed", "Denied", "Approval"] },
          rationale: { type: "string" }
        },
        required: ["scenarioId", "proposed", "rationale"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "recordAudit",
      description: "Append an entry to the signed audit log.",
      parameters: {
        type: "object",
        properties: {
          actor: { type: "string" },
          summary: { type: "string" }
        },
        required: ["actor", "summary"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "finalizeRecommendation",
      description:
        "Produce the final remediation/recommendation text and end the run.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"]
      }
    }
  }
];
