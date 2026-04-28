import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rootDir = resolve(process.cwd());
const env = loadEnv(join(rootDir, ".env"));
const port = Number(env.LIVE_BRIDGE_PORT || process.env.LIVE_BRIDGE_PORT || 8787);
const sandboxName = env.NEMOCLAW_SANDBOX || process.env.NEMOCLAW_SANDBOX || "ran-drift-demo";
const subscribers = new Set();

const scenarioPrompts = {
  "safe-neighbor-update":
    "You are the NemoClaw RAN drift guard. Review a safe neighbor-list update for DAL-N41-118. Use policy-aware reasoning, identify what OpenShell should validate, and return allow/deny/approval plus evidence.",
  "n78-power-drift":
    "You are the NemoClaw RAN drift guard. Review CHI-N78-042 where transmitPowerDbm changes from 34 to 41 on band n78 in the Midwest. Check regional power policy, sandbox limits, tests to run, and remediation.",
  "emergency-approval":
    "You are the NemoClaw RAN drift guard. Review NYC-B66-009 emergency-services overlay changing handoverThresholdDb from -108 to -116. Explain why approval may be required and what evidence to collect.",
  "denied-oss-lookup":
    "You are the NemoClaw RAN drift guard. Review a request to validate SEA-N258-017 by querying production OSS/NMS. Explain the OpenShell policy boundary and safe alternative.",
  "missing-rollback":
    "You are the NemoClaw RAN drift guard. Review CHI-N78-042 handoverThresholdDb change from -105 to -111 with no rollback plan. Decide merge readiness and remediation."
};

function loadEnv(path) {
  const loaded = { ...process.env };
  if (!existsSync(path)) {
    return loaded;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const splitAt = trimmed.indexOf("=");
    if (splitAt === -1) {
      continue;
    }
    const key = trimmed.slice(0, splitAt).trim();
    const rawValue = trimmed.slice(splitAt + 1).trim();
    loaded[key] = rawValue.replace(/^["']|["']$/g, "");
  }
  return loaded;
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

function publish(event) {
  const payload = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...event
  };
  for (const res of subscribers) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
  return payload;
}

function runShell(command) {
  return new Promise((resolveRun) => {
    const child = spawn("sh", ["-lc", command], {
      cwd: rootDir,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
    child.on("error", (error) => resolveRun({ code: 1, stdout, stderr: error.message }));
  });
}

function shellQuote(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function getStatus() {
  const [nemoclaw, openshell, docker, list] = await Promise.all([
    runShell("command -v nemoclaw || true"),
    runShell("command -v openshell || true"),
    runShell("docker version --format '{{.Server.Version}}' 2>/dev/null || true"),
    runShell("nemoclaw list 2>/dev/null || true")
  ]);

  return {
    envFilePresent: existsSync(join(rootDir, ".env")),
    nvidiaApiKeyPresent: Boolean(env.NVIDIA_API_KEY),
    sandboxName,
    nemoclawPresent: Boolean(nemoclaw.stdout.trim()),
    openshellPresent: Boolean(openshell.stdout.trim()),
    dockerReachable: Boolean(docker.stdout.trim()),
    nemoclawList: list.stdout.trim(),
    liveBridgePort: port
  };
}

function agentCommand(prompt) {
  const override = env.NEMOCLAW_AGENT_CMD;
  if (override) {
    return override.includes("{prompt}")
      ? override.replace("{prompt}", shellQuote(prompt))
      : `${override} ${shellQuote(prompt)}`;
  }

  return [
    "nemoclaw",
    shellQuote(sandboxName),
    "connect --",
    "openclaw agent --agent main --local --session-id ran-drift-demo -m",
    shellQuote(prompt)
  ].join(" ");
}

async function runScenario(id) {
  const prompt = scenarioPrompts[id];
  if (!prompt) {
    return { ok: false, error: `Unknown scenario: ${id}` };
  }

  const status = await getStatus();
  publish({ kind: "status", level: "info", message: "Live NemoClaw preflight complete.", detail: status });

  if (!status.envFilePresent || !status.nvidiaApiKeyPresent) {
    const message = "Missing .env or NVIDIA_API_KEY. Add the key, run NemoClaw onboarding, then retry.";
    publish({ kind: "blocked", level: "error", message });
    return { ok: false, error: message };
  }

  if (!status.nemoclawPresent) {
    const message = "nemoclaw CLI is not installed yet. Run scripts/nemoclaw-install.sh first.";
    publish({ kind: "blocked", level: "error", message });
    return { ok: false, error: message };
  }

  const command = agentCommand(prompt);
  publish({ kind: "agent", level: "running", message: "Starting live OpenClaw agent turn through NemoClaw.", command });

  const child = spawn("sh", ["-lc", command], {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => publish({ kind: "stdout", level: "info", message: chunk.toString() }));
  child.stderr.on("data", (chunk) => publish({ kind: "stderr", level: "warn", message: chunk.toString() }));
  child.on("close", (code) => {
    publish({
      kind: "agent",
      level: code === 0 ? "complete" : "error",
      message: `Live NemoClaw agent command exited with code ${code}.`
    });
  });

  return { ok: true };
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (req.url === "/api/live/status" && req.method === "GET") {
    json(res, 200, await getStatus());
    return;
  }

  if (req.url === "/api/live/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    subscribers.add(res);
    res.write(`data: ${JSON.stringify({ kind: "bridge", level: "info", message: "Live bridge connected." })}\n\n`);
    req.on("close", () => subscribers.delete(res));
    return;
  }

  if (req.url === "/api/live/run" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        json(res, 200, await runScenario(parsed.scenarioId));
      } catch (error) {
        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.log(`Live NemoClaw bridge listening on http://localhost:${port}`);
});
