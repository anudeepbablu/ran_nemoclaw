# Project Task Board

Status values: `Backlog`, `Ready`, `In Progress`, `In Review`, `Done`, `Blocked`.

| ID | Status | PR | Area | Task | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| DOC-001 | Done | PR 1 | docs | Create PRD | `docs/PRD.md` captures goal, audience, scope, scenarios, and acceptance criteria. |
| DOC-002 | Done | PR 1 | docs | Create repo README | `README.md` explains purpose, sandbox requirement, setup, and PR sequence. |
| DOC-003 | Done | PR 1 | tracking | Create task board | `TASKS.md` tracks status, PR, area, task, and acceptance criteria. |
| DOC-004 | Done | PR 5 | demo-readiness | Create demo runbook | `docs/DEMO_RUNBOOK.md` covers customer walkthrough and expected checkpoints. |
| GIT-001 | Blocked | PR 1 | github | Connect GitHub remote | User provides or creates repository owner/name; local remote is configured. |
| GIT-002 | Blocked | PR 1 | github | Mirror task epics to GitHub Issues | Issues exist for docs, frontend, simulator, policy-engine, openshell, testing, and demo-readiness. |
| GIT-003 | Blocked | PRs 1-5 | github | Open draft PRs | Branches are pushed and draft PRs are opened from `codex/*` branches. |
| APP-001 | Done | PR 2 | frontend | Create Vite React scaffold | App has TypeScript, Vite config, root HTML, package scripts, and source entrypoint. |
| APP-002 | Done | PR 2 | frontend | Add command-center layout | App shell includes header, scenario rail, tab navigation, and responsive dashboard. |
| APP-003 | Done | PR 2 | sandbox | Add sandbox status header | Header shows Brev sandbox, OpenShell, Policy Engine, RAG, and production-access state. |
| SIM-001 | Done | PR 3 | simulator | Define core domain types | `RanSite`, `ConfigChange`, `PolicyDecision`, `AgentEvent`, `RagEvidence`, and `AuditEntry` exist. |
| SIM-002 | Done | PR 3 | simulator | Add telecom fixtures | Fixtures cover sites, scenarios, RAG evidence, and policy behavior. |
| SIM-003 | Done | PR 3 | simulator | Add scenario evaluator | Simulator returns deterministic decisions, shell transcript, recommendations, and audit entries. |
| SIM-004 | Done | PR 3 | simulator | Add scenario injection controls | UI can trigger safe update, power drift, emergency approval, denied OSS lookup, and missing rollback plan. |
| UI-001 | Done | PR 4 | frontend | Add Live Monitor view | View shows 24/7 agent status, active change, risk, event feed, and scenario history. |
| UI-002 | Done | PR 4 | frontend | Add RAN Impact view | View shows impacted sites, vendor/band metadata, risk level, and topology-style visualization. |
| UI-003 | Done | PR 4 | policy-engine | Add Policy Engine view | View shows allow, deny, and approval-required decisions with reasons and policy names. |
| UI-004 | Done | PR 4 | openshell | Add OpenShell view | View shows command transcript with allowed, blocked, and approval-required commands. |
| UI-005 | Done | PR 4 | rag | Add RAG Evidence view | View shows internal-doc evidence cards tied to policy checks. |
| UI-006 | Done | PR 4 | audit | Add Audit Trail view | View shows chronological trace from monitor event to recommendation. |
| UI-007 | Done | PR 4 | frontend | Polish responsive UI | Desktop and mobile layouts are dense, legible, and free-exploration friendly. |
| TEST-001 | Done | PR 5 | testing | Add simulator unit tests | Tests cover safe update, power drift, emergency approval, denied OSS lookup, and missing rollback plan. |
| TEST-002 | Backlog | PR 5 | testing | Add browser smoke tests | Browser checks verify all tabs render and scenario injection updates the dashboard. |
| TEST-003 | Done | PR #13 | testing | Run package checks in Docker | `npm test` and `npm run build` run inside the local Docker container. |
| DOCKER-001 | Done | PR #13 | sandbox | Install local Docker runtime | Docker CLI and Colima are installed and Colima is running locally. |
| DOCKER-002 | Done | PR #13 | sandbox | Add Docker dev workflow | `Dockerfile`, `.dockerignore`, and Docker helper scripts support container-only development. |
| DOCKER-003 | Done | PR #13 | sandbox | Publish Docker workflow PR | Branch `codex/docker-dev-environment` is pushed and opened as draft PR #13. |
| DOCKER-004 | Done | Issue #14 | tracking | Create Docker tracking issue | GitHub issue #14 tracks local Docker sandbox work. |
| LIVE-001 | Done | PR #15 | live-nemoclaw | Add live bridge | Host-side bridge streams live NemoClaw/OpenShell status and agent events over SSE. |
| LIVE-002 | Done | PR #15 | live-nemoclaw | Add NVIDIA `.env` support | `.env.example` documents `NVIDIA_API_KEY`, model, sandbox, and command override. |
| LIVE-003 | Done | PR #15 | live-nemoclaw | Add NemoClaw setup scripts | Scripts install NemoClaw, run NVIDIA-backed onboarding, and check sandbox status. |
| LIVE-004 | Ready | PR #15 | live-nemoclaw | Run NemoClaw onboarding | Requires user-created `.env` with `NVIDIA_API_KEY`. |
| LIVE-005 | Ready | PR #15 | live-nemoclaw | Replace simulated customer path | Customer demo should use live bridge events as the primary story, with simulation only as fallback. |
| UI-100 | Done | PR 0 (revamp) | frontend | Promote `RAN Guard/` prototype to canonical Vite/TS UI | Calm Enterprise direction (with light Ops Console touches) ported as `src/App.tsx`. New scenario shape with `rules[]`, `openshell[]`, `timeline[]`, `rag[]`, `diff[]` becomes the agent contract. Old prototype folder dropped. `npm test` and `npm run build` pass. |
| AGENT-001 | Done | PR 1 (revamp) | policy-engine | Extract deterministic Policy Engine validator | Pure TS module that derives `Decision` from `PolicyRule[]`. Validator owns final verdict and can override an LLM proposal. `onFail` field on each rule distinguishes deny-fails from approve-fails. Tests assert validator output matches each scenario's hardcoded decision. |
| AGENT-002a | Done | PR 2a (revamp) | live-nemoclaw | Real OpenShell integration: scripted runner inside sandbox + bridge | Real `openshell sandbox exec` invocation. `policies/ran-drift-demo.yaml` defines the boundary (allow inference proxy + nvidia-build, deny prod-oss + nms by default). Runner inside sandbox emits NDJSON `AgentEvent`s; bridge relays as SSE. Nine tools (5 OpenShell-routed, 4 pure-TS). Bridge degrades to dev-mode when OpenShell or sandbox missing. 30 tests pass. |
| AGENT-002b | Done | PR 2b (revamp) | live-nemoclaw | Nemotron tool-calling loop via OpenShell inference proxy | OpenAI-compatible Nemotron client (`server/agent/nemotron.mjs`) and tool-calling loop (`server/agent/agent-loop.mjs`). Runner accepts `--mode {scripted,llm,auto}` (auto picks LLM when `NVIDIA_API_KEY` is set). LLM mode falls back to scripted on error so the demo doesn't dead-end on a flaky network. `applyChange` defense-in-depth refuses any verdict ≠ Allowed even when LLM tries. 35 tests pass (added: nemotron client, agent-loop happy path, max-iterations guard, applyChange refusal). |
| AGENT-003 | Backlog | PR 3 (revamp) | frontend | Wire UI to live event stream | Six tabs subscribe to SSE instead of running the local timer. Forced-verdict knob becomes a real validator-override demo affordance. Closes LIVE-005. |
| AGENT-004 | Backlog | PR 4 (revamp) | live-nemoclaw | Latency timeout + graceful fallback | Bridge enforces a per-tool timeout. UI degrades to "Policy Engine still issued the verdict" if the LLM stalls. Demo survives flaky network. |
