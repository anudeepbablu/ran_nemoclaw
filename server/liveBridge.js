// Host-side bridge.
//
// Routes:
//   GET  /api/live/status   — sandbox + tooling health (powers the Diagnostics drawer)
//   GET  /api/events        — SSE stream of AgentEvents from the most recent run
//   POST /api/run           — body { scenarioId } — spawns the in-sandbox agent runner
//                             and relays its stdout NDJSON as SSE events
//
// Spawn strategy:
//   1. If `openshell` is installed AND the configured sandbox exists, run via
//        openshell sandbox exec --name <SANDBOX> -- node /workspace/server/agent/runner.mjs --scenario <id>
//      so the runner is governed by the real OpenShell policy boundary.
//   2. Otherwise fall back to running the runner on the host (dev mode).
//      The bridge marks events with mode=dev so the UI can surface that
//      OpenShell enforcement is not active.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitDeterministicFallback } from "./agent/agent-loop.mjs";
import { getScenario } from "./data/fixtures.js";
import { publish, subscribe } from "./events.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const env = loadEnv(join(repoRoot, ".env"));

const port = Number(env.LIVE_BRIDGE_PORT || process.env.LIVE_BRIDGE_PORT || 8787);
const sandboxName =
  env.OPENSHELL_SANDBOX_NAME ||
  process.env.OPENSHELL_SANDBOX_NAME ||
  "ran-drift-demo";
const RUN_TIMEOUT_MS = Number(
  env.RUN_TIMEOUT_MS || process.env.RUN_TIMEOUT_MS || 90_000
);

// activeRun tracks the in-flight child + the run's progress. Events the
// runner emits update hasVerdict/hasComplete so the watchdog knows what
// to synthesize on timeout.
let activeRun = null;

// ─── env loader ──────────────────────────────────────────────────────────

function loadEnv(path) {
  const loaded = { ...process.env };
  if (!existsSync(path)) return loaded;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitAt = trimmed.indexOf("=");
    if (splitAt === -1) continue;
    const key = trimmed.slice(0, splitAt).trim();
    const rawValue = trimmed.slice(splitAt + 1).trim();
    loaded[key] = rawValue.replace(/^["']|["']$/g, "");
  }
  return loaded;
}

// ─── shell helpers ───────────────────────────────────────────────────────

function runShell(command) {
  return new Promise((resolveRun) => {
    const child = spawn("sh", ["-lc", command], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
    child.on("error", (e) => resolveRun({ code: 1, stdout, stderr: e.message }));
  });
}

async function getStatus() {
  const [openshellBin, sandboxList, dockerVer] = await Promise.all([
    runShell("command -v openshell || true"),
    runShell("openshell sandbox list --names 2>/dev/null || true"),
    runShell("docker version --format '{{.Server.Version}}' 2>/dev/null || true")
  ]);

  const openshellPresent = Boolean(openshellBin.stdout.trim());
  const sandboxPresent =
    openshellPresent &&
    sandboxList.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .includes(sandboxName);

  return {
    envFilePresent: existsSync(join(repoRoot, ".env")),
    nvidiaApiKeyPresent: Boolean(env.NVIDIA_API_KEY),
    sandboxName,
    openshellPresent,
    sandboxPresent,
    dockerReachable: Boolean(dockerVer.stdout.trim()),
    sandboxList: sandboxList.stdout.trim(),
    liveBridgePort: port,
    mode: openshellPresent && sandboxPresent ? "sandbox" : "dev"
  };
}

// ─── HTTP helpers ────────────────────────────────────────────────────────

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

// ─── runner spawn + relay ────────────────────────────────────────────────

async function startRun(scenarioId) {
  if (activeRun) {
    return { ok: false, error: "another run is already in progress" };
  }

  const status = await getStatus();
  const useSandbox = status.mode === "sandbox";

  const runnerPathHost = "server/agent/runner.mjs";
  const runnerPathSandbox = "/workspace/server/agent/runner.mjs";

  let child;
  let cmdLabel;
  if (useSandbox) {
    cmdLabel = `openshell sandbox exec --name ${sandboxName} -- node ${runnerPathSandbox} --scenario ${scenarioId}`;
    child = spawn(
      "openshell",
      [
        "sandbox",
        "exec",
        "--name",
        sandboxName,
        "--",
        "node",
        runnerPathSandbox,
        "--scenario",
        scenarioId
      ],
      { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] }
    );
  } else {
    cmdLabel = `node ${runnerPathHost} --scenario ${scenarioId}`;
    child = spawn(
      "node",
      [join(repoRoot, runnerPathHost), "--scenario", scenarioId],
      { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] }
    );
  }

  const runId = `dispatch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const state = {
    child,
    runId,
    scenarioId,
    hasVerdict: false,
    hasRecommendation: false,
    hasComplete: false,
    timedOut: false,
    watchdog: null
  };
  activeRun = state;

  // Watchdog: kill the child and synthesize whichever events haven't been
  // emitted yet. The Policy Engine becomes the demo's last line of defense.
  state.watchdog = setTimeout(() => {
    if (state.hasComplete) return;
    state.timedOut = true;
    const reason = `Run exceeded ${RUN_TIMEOUT_MS}ms — Policy Engine fallback`;
    try {
      child.kill("SIGTERM");
    } catch {
      /* child may already be dead */
    }
    publish({ kind: "run.warning", runId, message: reason, t: nowHM() });
    fallback(scenarioId, runId, state, reason);
  }, RUN_TIMEOUT_MS);

  publish({
    kind: "run.dispatched",
    runId,
    scenarioId,
    mode: status.mode,
    cmd: cmdLabel,
    t: nowHM()
  });

  // stdout: parse NDJSON line-by-line, forward each as an SSE event and
  // update the run's progress flags so the watchdog knows what's pending.
  const out = createInterface({ input: child.stdout });
  out.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const event = JSON.parse(trimmed);
      trackProgress(state, event);
      publish(event);
    } catch (err) {
      publish({
        kind: "run.warning",
        runId,
        message: `non-JSON line from runner: ${trimmed.slice(0, 200)}`,
        t: nowHM()
      });
    }
  });

  // stderr: surface as warnings.
  child.stderr.on("data", (chunk) => {
    publish({
      kind: "run.warning",
      runId,
      message: chunk.toString().trim(),
      t: nowHM()
    });
  });

  child.on("close", (code) => {
    if (state.watchdog) clearTimeout(state.watchdog);
    if (!state.hasComplete && !state.timedOut) {
      const reason = `Runner exited (code ${code}) before run.complete — Policy Engine fallback`;
      fallback(scenarioId, runId, state, reason);
    }
    publish({
      kind: "run.exit",
      runId,
      code: code ?? 1,
      t: nowHM()
    });
    if (activeRun?.child === child) activeRun = null;
  });

  child.on("error", (err) => {
    if (state.watchdog) clearTimeout(state.watchdog);
    publish({
      kind: "run.error",
      runId,
      message: err.message,
      t: nowHM()
    });
    if (!state.hasComplete) {
      fallback(
        scenarioId,
        runId,
        state,
        `Runner spawn error (${err.message}) — Policy Engine fallback`
      );
    }
    if (activeRun?.child === child) activeRun = null;
  });

  return { ok: true, runId, mode: status.mode };
}

function trackProgress(state, event) {
  switch (event.kind) {
    case "policy.verdict":
      state.hasVerdict = true;
      break;
    case "recommendation":
      state.hasRecommendation = true;
      break;
    case "run.complete":
      state.hasComplete = true;
      break;
    default:
      break;
  }
}

// Synthesize whichever events the runner didn't manage to emit. Always
// ends with run.complete so the UI sees the run finish.
function fallback(scenarioId, runId, state, reason) {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    publish({
      kind: "run.error",
      runId,
      message: `${reason} (scenario ${scenarioId} not found)`,
      t: nowHM()
    });
    publish({ kind: "run.complete", runId, verdict: "Denied", t: nowHM() });
    state.hasComplete = true;
    return;
  }

  const verdict = emitDeterministicFallback({
    scenario,
    runId,
    emit: publish,
    reason,
    alreadyHasVerdict: state.hasVerdict
  });

  publish({ kind: "run.complete", runId, verdict, t: nowHM() });
  state.hasComplete = true;
  state.hasVerdict = true;
  state.hasRecommendation = true;
}

function nowHM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ─── HTTP server ──────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (req.url === "/api/live/status" && req.method === "GET") {
    json(res, 200, await getStatus());
    return;
  }

  if (req.url === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    const unsubscribe = subscribe(res);
    res.write(
      `data: ${JSON.stringify({
        kind: "bridge.connected",
        t: nowHM()
      })}\n\n`
    );
    req.on("close", unsubscribe);
    return;
  }

  if (req.url === "/api/run" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      if (!body.scenarioId) {
        json(res, 400, { ok: false, error: "scenarioId required" });
        return;
      }
      const result = await startRun(body.scenarioId);
      json(res, result.ok ? 202 : 409, result);
    } catch (err) {
      json(res, 400, {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(port, () => {
  console.log(`live bridge listening on http://localhost:${port}`);
  console.log(`sandbox name: ${sandboxName}`);
});
