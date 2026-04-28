# NemoClaw 24/7 RAN Drift Guard Demo

A sandbox-hosted telecom demo that shows how a NemoClaw-powered assistant can monitor RAN configuration drift around the clock, evaluate internal engineering policy, run controlled OpenShell checks, and produce auditable remediation guidance.

The first audience is platform and security leadership. The UI makes the safety boundary visible: Brev sandbox status, OpenShell command control, Policy Engine decisions, blocked production OSS/NMS access, and simulated internal RAG evidence.

## Demo Shape

- Standalone React/Vite TypeScript app.
- Browser-only deterministic simulation.
- No live customer systems, production telemetry, subscriber data, or real OSS/NMS calls.
- Designed to run inside a Brev/NemoClaw sandbox.

## Planned PR Sequence

| PR | Branch | Focus |
| --- | --- | --- |
| 1 | `codex/docs-prd-task-list` | PRD, task board, and repo overview |
| 2 | `codex/app-scaffold` | React/Vite shell, navigation, and sandbox status |
| 3 | `codex/ran-simulator` | RAN fixtures, scenario engine, policy decisions, audit events |
| 4 | `codex/visual-dashboards` | Live monitor, RAN impact, Policy Engine, OpenShell, RAG, audit views |
| 5 | `codex/tests-demo-readiness` | Simulator tests, UI checks, demo runbook |

## Docker Development

All development and validation should run in the local Docker runtime. On macOS this repo uses the Docker CLI with Colima.

One-time local runtime setup:

```bash
brew install docker colima
colima start --cpu 4 --memory 8 --disk 40
docker version
```

Build the development image:

```bash
sh scripts/docker-build.sh
```

Run the app in a container:

```bash
sh scripts/docker-dev.sh
```

Then open:

```text
http://localhost:5173
```

Run tests and production build in a container:

```bash
sh scripts/docker-test.sh
```

## Sandbox Development

Run these commands from inside the Brev/NemoClaw sandbox:

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run build
```

The Docker workflow is preferred for local development. The Brev/NemoClaw sandbox remains the target environment for the customer demo.

## Live NemoClaw Mode

The app has two layers:

- The browser dashboard at `http://localhost:5173`.
- A host-side live bridge at `http://localhost:8787` that calls NemoClaw/OpenShell commands and streams events to the UI.

Create a local `.env` file:

```bash
cp .env.example .env
```

Set `NVIDIA_API_KEY` in `.env`. The key is loaded by the live bridge and NemoClaw onboarding scripts, and `.env` is ignored by Git.

Install and onboard NemoClaw:

```bash
sh scripts/nemoclaw-install.sh
sh scripts/nemoclaw-onboard.sh
```

Run the host-side live bridge:

```bash
node server/liveBridge.js
```

In a second terminal, run the browser dashboard in Docker:

```bash
sh scripts/docker-dev.sh
```

The UI will show whether `.env`, Docker, NemoClaw, and OpenShell are actually present. Scenario buttons call the live bridge. If your installed NemoClaw/OpenClaw CLI exposes a different non-interactive agent command, set `NEMOCLAW_AGENT_CMD` in `.env` and include `{prompt}` where the generated RAN prompt should go.

## Project Tracking

- [docs/PRD.md](docs/PRD.md) defines the product intent and acceptance criteria.
- [TASKS.md](TASKS.md) is the source-of-truth implementation tracker until GitHub Issues are available.
- [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) contains the customer walkthrough.

## GitHub Status

This local workspace does not currently have a GitHub remote, GitHub CLI, or installed GitHub connector account. After a repository is created and connected, the task board epics should be mirrored into GitHub Issues and the planned `codex/*` branches should be opened as draft PRs.
