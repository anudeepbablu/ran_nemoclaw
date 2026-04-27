# Customer Demo Runbook

## Setup

Run the app from inside the Brev/NemoClaw sandbox:

```bash
npm install
npm run dev
```

Open the Vite URL in the sandbox browser.

## Talk Track

The demo shows a 24/7 NemoClaw assistant watching telecom RAN config changes. The agent can inspect safe inputs, use simulated internal policy evidence, run OpenShell checks, and produce an auditable decision. It cannot access production OSS/NMS, secrets, or PII unless policy allows it.

## Walkthrough

1. Start on **Live Monitor**.
   - Point out the active sandbox boundary in the header.
   - Show the always-on agent status and incoming change feed.
2. Trigger **n78 Power Drift**.
   - Show the risk score changing.
   - Open **RAN Impact** and highlight the impacted Midwest n78 site.
3. Open **RAG Evidence**.
   - Show regional RAN limits and maintenance policy evidence.
4. Open **Policy Engine**.
   - Show the `deny` decision and policy reason.
5. Open **OpenShell**.
   - Show allowed fixture validation and blocked production OSS/NMS access.
6. Open **Audit Trail**.
   - Walk through the trace from monitor event to final recommendation.
7. Trigger **Emergency Approval**.
   - Show the difference between `deny` and `approval-required`.

## Expected Customer Takeaways

- NemoClaw is useful because the agent has enough autonomy to inspect, reason, test, and recommend.
- OpenShell matters because command execution is controlled and auditable.
- Policy Engine matters because the model cannot bypass enterprise access rules.
- The 24/7 monitoring story is credible because every scenario produces a repeatable trace.

## Closing Line

NemoClaw is not just generating code. It is operating as a governed network engineering assistant that can continuously watch sensitive changes and explain every action it takes.
