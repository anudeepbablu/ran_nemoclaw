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

## Local Development

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

## Project Tracking

- [docs/PRD.md](docs/PRD.md) defines the product intent and acceptance criteria.
- [TASKS.md](TASKS.md) is the source-of-truth implementation tracker until GitHub Issues are available.
- [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) contains the customer walkthrough.

## GitHub Status

This local workspace does not currently have a GitHub remote, GitHub CLI, or installed GitHub connector account. After a repository is created and connected, the task board epics should be mirrored into GitHub Issues and the planned `codex/*` branches should be opened as draft PRs.
