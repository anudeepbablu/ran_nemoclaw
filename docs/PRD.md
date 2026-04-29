# Product Requirements Document: 24/7 RAN Configuration Drift Guard

## Summary

Create a visually rich demo that shows a NemoClaw-powered agent monitoring telecom RAN configuration drift 24/7 from inside a sandbox. The product story is not generic coding automation; it is governed autonomy for sensitive network engineering environments.

The demo should help customer platform and security leaders understand how NemoClaw can inspect proposed RAN changes, consult internal policy knowledge, run controlled OpenShell checks, and produce an audit-ready decision without touching production OSS/NMS systems or customer data.

## Goals

- Show NemoClaw as an always-on assistant that detects risky RAN config changes.
- Make Policy Engine decisions visible and explainable.
- Make OpenShell command execution visibly sandboxed and auditable.
- Show simulated internal RAG evidence grounding the agent's decision.
- Give presenters deterministic scenarios that are reliable in a customer meeting.

## Audience

Primary audience: telecom platform, security, and AI governance leaders.

Secondary audience: RAN engineering stakeholders who want to see realistic telecom policy checks and remediation guidance.

## Demo Story

1. A RAN config change appears from a PR, change queue, or staging feed.
2. The 24/7 NemoClaw agent notices the change and starts an evaluation.
3. The agent uses simulated internal RAG evidence for RAN limits, maintenance windows, rollback policy, and emergency-services rules.
4. OpenShell runs controlled local checks and validation commands.
5. The Policy Engine allows safe actions, denies unsafe actions, or marks actions as approval-required.
6. The UI presents the final decision, blast radius, audit trail, and remediation recommendation.

## In Scope

- Browser-only React/Vite demo app.
- Deterministic local simulation with no backend.
- RAN drift scenarios for safe update, power-limit violation, emergency-services approval, denied production lookup, and missing rollback plan.
- Dashboard views for live monitoring, RAN impact, Policy Engine, OpenShell, RAG evidence, and audit trail.
- Visible sandbox boundary and security posture.
- Repo-tracked PRD, task board, and demo runbook.

## Out Of Scope

- Live production OSS/NMS access.
- Live customer telemetry or subscriber data.
- Real GitHub PR monitoring.
- Real RAG ingestion or customer document connectors.
- Production NemoClaw deployment automation.
- Live policy mutation against customer systems.

## User Experience Requirements

- First screen must be the working command center, not a landing page.
- Users can freely explore all views through tabs.
- Scenario buttons let presenters inject deterministic RAN changes.
- Safety status is visible without opening a separate settings page.
- Policy decisions are represented with clear allow, deny, and approval-required states.
- OpenShell transcript separates allowed commands from blocked or approval-required commands.
- The RAN impact view must visually show affected sites and risk intensity.
- Text must remain legible and non-overlapping on desktop and mobile.

## Core Scenarios

### Safe Neighbor-List Update

Expected result: allowed.

Acceptance criteria:

- Policy Engine shows all required checks as allow.
- OpenShell validates fixtures and runs simulated unit tests.
- Audit trail ends with a low-risk recommendation.

### n78 Transmit-Power Drift

Expected result: denied.

Acceptance criteria:

- Change shows transmit power exceeding the Midwest n78 limit.
- Policy Engine denies the change with a regional power-limit reason.
- RAG evidence references regional RAN power limits.
- Remediation recommends reducing power to the approved limit.

### Emergency-Services Critical Site Change

Expected result: approval-required.

Acceptance criteria:

- Site is marked emergency-services protected.
- Policy Engine requires elevated RAN approval.
- Audit trail shows the agent paused before making a risky change.

### Denied Production OSS/NMS Lookup

Expected result: denied.

Acceptance criteria:

- OpenShell transcript shows an attempted production OSS/NMS lookup.
- Policy Engine denies production access from the sandbox.
- UI shows the approved alternative: synthetic inventory fixture and internal docs.

### Missing Rollback Plan

Expected result: denied.

Acceptance criteria:

- Change lacks rollback metadata.
- Policy Engine denies merge readiness.
- Remediation recommends attaching a rollback plan template before retry.

## Success Metrics

- A presenter can explain the full safety chain in under five minutes.
- A platform/security stakeholder can identify what the agent accessed, what it was denied, and why.
- The demo can run offline after dependencies are installed.
- Scenario results are deterministic and repeatable.

## Risks And Mitigations

- Risk: customers mistake simulation for production integration.
  Mitigation: label simulated RAG and synthetic fixtures clearly.
- Risk: UI becomes too RAN-engineering-heavy.
  Mitigation: lead with policy, sandbox, audit, and access control.
- Risk: GitHub PR flow is unavailable.
  Mitigation: keep `TASKS.md` as the canonical tracker until repo access is connected.
