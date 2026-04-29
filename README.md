# RAN Drift Guard — NemoClaw Customer Demo

An OpenShell-sandboxed telecom demo showing how a NemoClaw-powered agent can monitor RAN configuration drift 24/7, retrieve scoped internal policy evidence, run sandboxed validation, and produce an auditable allow / deny / approval-required decision — without touching production OSS, NMS, or subscriber data.

The audience is platform and security leadership. Every authority boundary is visible in the UI: the OpenShell sandbox, the deterministic Policy Engine, the network egress allowlist that blocks production systems, and the internal RAG evidence the agent grounded its decision on.

## Demo Architecture

```
Browser UI (Vite/React/TS, :5173)
   │  HTTP + SSE
   ▼
Host bridge (node server/liveBridge.js, :8787)
   │  spawns:  openshell sandbox exec --name ran-drift-demo -- node /workspace/server/agent/runner.mjs --scenario <id>
   ▼
OpenShell sandbox (containerized, governed by policies/ran-drift-demo.yaml)
   │
   ├─ in-sandbox runner: tool-calling agent (Nemotron via OpenShell inference proxy)
   ├─ each tool call: subprocess governed by sandbox network/FS/process policy
   └─ "denied prod-OSS" is a real proxy 403, not a simulation
```

Two enforcement planes show up in the UI:

- **OpenShell Policy Engine** — governs *what the agent can do*: which hosts it can reach, which paths it can write, which binaries can spawn what. Real proxy/Landlock/syscall enforcement defined in `policies/ran-drift-demo.yaml`.
- **Deterministic Policy validator** — governs *whether the proposed RAN change is approved*: rule-by-rule verdicts producing Allowed / Denied / Approval. Lives in `src/policy/validator.ts` (and a JS mirror at `server/agent/policy.js`); has veto power over the LLM's proposal.

## Quickstart

### 1. Install OpenShell (one-time)

OpenShell is a real prerequisite. Install with:

```bash
sh scripts/openshell-install.sh
```

This wraps the official installer (`https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh`) and verifies Docker is running. Add `~/.local/bin` to your `PATH` if it isn't already.

### 2. Configure secrets

```bash
cp .env.example .env
# edit .env: set NVIDIA_API_KEY to your build.nvidia.com key
```

### 3. Bootstrap the sandbox

```bash
sh scripts/openshell-bootstrap.sh
```

That script runs four steps: creates the `nvidia-build` provider (picks up `NVIDIA_API_KEY` from your env), creates the `ran-drift-demo` sandbox from `--from openclaw` and uploads the workdir, applies the policy YAML, and routes inference through the provider.

### 4. Run the demo

```bash
npm install
npm run dev
```

That starts the host-side bridge and the Vite UI. Open `http://localhost:5173`.

The Diagnostics drawer in the UI tells you whether the bridge is in **sandbox mode** (real OpenShell enforcement) or **dev mode** (runner spawned directly on the host). Dev mode lets you iterate on the UI / runner without bootstrapping; sandbox mode is what the customer sees.

## Without OpenShell installed

The bridge will still run. It detects the missing CLI and falls back to spawning the runner directly on the host. UI events are flagged `mode: "dev"` so it's clear the OpenShell layer isn't actually enforcing. Useful for UI iteration and for CI.

## Docker workflow

All package checks run inside a local Docker container (Colima on macOS):

```bash
sh scripts/docker-build.sh   # build image
sh scripts/docker-test.sh    # npm test + npm run build
sh scripts/docker-dev.sh     # vite dev server only (no bridge)
```

For full demo dev (bridge + Vite together) on the host: `npm run dev`.

## Verifying inside the sandbox

You can run the agent runner manually to sanity-check the policy boundary:

```bash
openshell sandbox exec --name ran-drift-demo -- node /workspace/server/agent/runner.mjs --scenario power-drift
```

Stdout is NDJSON `AgentEvent` lines — what the bridge relays as SSE.

## Project Tracking

- [docs/PRD.md](docs/PRD.md) — product intent and acceptance criteria.
- [TASKS.md](TASKS.md) — implementation tracker.
- [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) — customer walkthrough.
- [policies/ran-drift-demo.yaml](policies/ran-drift-demo.yaml) — the OpenShell policy that enforces the sandbox boundary.

## Repo Layout

```
data/
  fixtures.json         single source of truth for scenarios (UI + bridge both read this)
policies/
  ran-drift-demo.yaml   OpenShell policy YAML
scripts/
  openshell-install.sh  install OpenShell
  openshell-bootstrap.sh  create provider + sandbox + policy + inference route
  openshell/*.js        in-sandbox CLI tools (inspect, validate, sim-inventory, apply-change)
server/
  liveBridge.js         host-side HTTP/SSE bridge
  events.js             SSE pub/sub
  agent/
    runner.mjs          in-sandbox runner (NDJSON over stdout)
    tools.mjs           9-tool surface (5 OpenShell-routed, 4 pure)
    scripts.mjs         per-scenario tool sequences (PR 2a scripted mode)
    policy.js           validator (mirror of src/policy/validator.ts)
  data/fixtures.js      bridge-side JSON loader
src/
  App.tsx               Calm Enterprise UI
  policy/validator.ts   deterministic Policy Engine (TS source of truth)
  simulator/useScenarioRunner.ts  in-browser scripted fallback
```
