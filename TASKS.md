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
| TEST-003 | Blocked | PR 5 | testing | Run package checks | Requires `npm install` inside Brev/NemoClaw sandbox. |
