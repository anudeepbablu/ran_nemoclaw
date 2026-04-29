// Per-scenario scripted tool sequences for the PR 2a runner.
//
// Each entry is an array of tool calls the runner executes in order.
// Steps are { tool, args, narrate? } where narrate is an optional
// timeline event to emit AFTER the tool returns (in addition to the
// tool's own derived events).
//
// PR 2b replaces this dispatch with a real Nemotron tool-calling loop
// against the same toolRegistry. The scripts here become the testbed
// for the in-sandbox event pipeline.

export const scripts = {
  "safe-update": [
    { tool: "inspectConfigChange", args: { changeId: "CHG-1001" }, narrate: { kind: "monitor", text: "24/7 monitor detected CHG-1001 in staging queue." } },
    { tool: "searchRagCorpus", args: { scenarioId: "safe-update", query: "neighbor relation policy n41 dallas" }, narrate: { kind: "rag", text: "Retrieved internal RAN policy chunks." } },
    { tool: "runValidationTests", args: { changeId: "CHG-1001" }, narrate: { kind: "policy", text: "Rules evaluated against the change." } },
    {
      tool: "proposePolicyDecision",
      args: {
        scenarioId: "safe-update",
        proposed: "Allowed",
        rationale: "Neighbor add is intra-frequency, within RSRP overlap bounds, vendor allowlisted."
      },
      narrate: { kind: "decision", text: "Verdict: Allowed. Auto-approved within sandbox boundary." }
    },
    { tool: "applyChange", args: { changeId: "CHG-1001", verdictFromContext: true }, narrate: { kind: "tests", text: "Applied change to synthetic config store." } },
    { tool: "recordAudit", args: { actor: "NemoClaw", summary: "Detected and approved CHG-1001 within sandbox boundary." } },
    { tool: "finalizeRecommendation", args: { text: "Allow the change after standard CI validation. Keep rollback metadata attached to the PR." }, narrate: { kind: "audit", text: "Audit entry signed and written." } }
  ],

  "power-drift": [
    { tool: "inspectConfigChange", args: { changeId: "CHG-1002" }, narrate: { kind: "monitor", text: "24/7 monitor detected proposed RAN config change CHG-1002." } },
    { tool: "searchRagCorpus", args: { scenarioId: "power-drift", query: "n78 transmit power cap midwest" }, narrate: { kind: "rag", text: "Retrieved scoped internal RAN policy evidence." } },
    { tool: "runValidationTests", args: { changeId: "CHG-1002" }, narrate: { kind: "policy", text: "Rules evaluated. Power envelope and tilt/power coupling failed." } },
    { tool: "queryInventory", args: { siteId: "CHI-N78-042" }, narrate: { kind: "guard", text: "Production OSS read refused at sandbox boundary; using internal cache." } },
    {
      tool: "proposePolicyDecision",
      args: {
        scenarioId: "power-drift",
        proposed: "Denied",
        rationale: "Δp=+4dBm exceeds Midwest n78 cap of 43dBm; tilt narrowed compounds interference."
      },
      narrate: { kind: "decision", text: "Verdict: Denied. Risk score 78/100. Remediation drafted." }
    },
    { tool: "recordAudit", args: { actor: "NemoClaw", summary: "Denied CHG-1002 — power envelope and interference budget breach." } },
    { tool: "finalizeRecommendation", args: { text: "Reduce tx.maxPower.dBm to ≤43 or request Tier-3 RF engineering review." }, narrate: { kind: "audit", text: "Audit entry signed and written." } }
  ],

  emergency: [
    { tool: "inspectConfigChange", args: { changeId: "CHG-1003" }, narrate: { kind: "monitor", text: "Emergency change submitted: E911 routing failover (DEN-MULTI-007)." } },
    { tool: "searchRagCorpus", args: { scenarioId: "emergency", query: "emergency 911 routing failover policy" }, narrate: { kind: "rag", text: "Retrieved E911 failover policy + runbook." } },
    { tool: "runValidationTests", args: { changeId: "CHG-1003" }, narrate: { kind: "policy", text: "Rules evaluated. P-070 forces human approval gate." } },
    { tool: "fetchVendorSchema", args: { band: "LTE-B66" }, narrate: { kind: "guard", text: "Vendor egress requires operator approval." } },
    {
      tool: "proposePolicyDecision",
      args: {
        scenarioId: "emergency",
        proposed: "Approval",
        rationale: "E911 path mutates — two-person approval required from RF Lead and NOC Director."
      },
      narrate: { kind: "decision", text: "Verdict: Approval Required. Awaiting human signoff." }
    },
    { tool: "recordAudit", args: { actor: "NemoClaw", summary: "Routed CHG-1003 to two-person approval (RF Lead + NOC Director)." } },
    { tool: "finalizeRecommendation", args: { text: "Pause auto-merge and route to senior RAN and public-safety approvers before execution." }, narrate: { kind: "audit", text: "Audit entry written; pending approver responses." } }
  ],

  "oss-lookup": [
    { tool: "inspectConfigChange", args: { changeId: "CHG-1004" }, narrate: { kind: "monitor", text: "Operator requested live OSS read for PHX-N41-029." } },
    { tool: "queryInventory", args: { siteId: "PHX-N41-029" }, narrate: { kind: "guard", text: "Production OSS read refused at sandbox boundary." } },
    { tool: "searchRagCorpus", args: { scenarioId: "oss-lookup", query: "phx-n41-029 last known state" }, narrate: { kind: "rag", text: "Internal cache hit; offering most recent record." } },
    { tool: "runValidationTests", args: { changeId: "CHG-1004" }, narrate: { kind: "policy", text: "Rules evaluated. Production OSS reach blocked." } },
    {
      tool: "proposePolicyDecision",
      args: {
        scenarioId: "oss-lookup",
        proposed: "Denied",
        rationale: "Sandbox egress allowlist forbids prod-oss; fallback served from internal cache."
      },
      narrate: { kind: "decision", text: "Verdict: Denied. Internal fallback offered to operator." }
    },
    { tool: "recordAudit", args: { actor: "NemoClaw", summary: "Refused live OSS read; served 23h-old internal cache record." } },
    { tool: "finalizeRecommendation", args: { text: "Use synthetic inventory fixtures or request a scoped production-access approval outside the sandbox." } }
  ],

  "no-rollback": [
    { tool: "inspectConfigChange", args: { changeId: "CHG-1005" }, narrate: { kind: "monitor", text: "Beamforming change submitted for SEA-N78-011." } },
    { tool: "searchRagCorpus", args: { scenarioId: "no-rollback", query: "beamforming change rollback policy" }, narrate: { kind: "rag", text: "Retrieved beamforming change policy and runbook." } },
    { tool: "runValidationTests", args: { changeId: "CHG-1005" }, narrate: { kind: "policy", text: "Rules evaluated. Rollback and test artifacts missing." } },
    {
      tool: "proposePolicyDecision",
      args: {
        scenarioId: "no-rollback",
        proposed: "Denied",
        rationale: "Rollback plan and pre-merge test suite both missing — required for PHY-layer changes."
      },
      narrate: { kind: "decision", text: "Verdict: Denied. Risk 71/100. Returned with remediation." }
    },
    { tool: "recordAudit", args: { actor: "NemoClaw", summary: "Denied CHG-1005 — missing rollback plan and test suite." } },
    { tool: "finalizeRecommendation", args: { text: "Attach the rollback plan template and pre-merge test suite, then resubmit." }, narrate: { kind: "audit", text: "Audit entry signed and written." } }
  ]
};
