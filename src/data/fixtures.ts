import type { RagEvidence, RanSite, Scenario } from "../types";

export const ranSites: RanSite[] = [
  {
    id: "CHI-N78-042",
    name: "Chicago West Sector 42",
    region: "Midwest",
    market: "Chicago",
    vendor: "Ericsson",
    band: "n78",
    criticality: "critical",
    coordinates: { x: 28, y: 42 }
  },
  {
    id: "DAL-N41-118",
    name: "Dallas North Macro 118",
    region: "South",
    market: "Dallas",
    vendor: "Nokia",
    band: "n41",
    criticality: "standard",
    coordinates: { x: 47, y: 68 }
  },
  {
    id: "NYC-B66-009",
    name: "Manhattan Emergency Overlay 009",
    region: "Northeast",
    market: "New York",
    vendor: "Samsung",
    band: "LTE-B66",
    criticality: "emergency-services",
    coordinates: { x: 71, y: 26 }
  },
  {
    id: "SEA-N258-017",
    name: "Seattle mmWave Hub 17",
    region: "West",
    market: "Seattle",
    vendor: "Ericsson",
    band: "n258",
    criticality: "standard",
    coordinates: { x: 17, y: 19 }
  }
];

export const ragEvidence: RagEvidence[] = [
  {
    id: "rag-power-midwest",
    title: "Regional RAN Power Limits",
    source: "RAN Engineering Standard 4.2",
    excerpt: "Midwest n78 sectors require approved EIRP caps before merge; exceptions require regional RF approval.",
    confidence: 0.94,
    appliesTo: ["n78-power-drift"]
  },
  {
    id: "rag-maintenance",
    title: "Maintenance Window Policy",
    source: "Network Change Control Guide",
    excerpt: "High-risk RAN changes must run inside approved maintenance windows with rollback metadata.",
    confidence: 0.91,
    appliesTo: ["n78-power-drift", "missing-rollback", "emergency-approval"]
  },
  {
    id: "rag-emergency",
    title: "Emergency Services Protection",
    source: "Public Safety Coverage Runbook",
    excerpt: "Changes impacting emergency-services cells require elevated approval and cannot be auto-merged.",
    confidence: 0.96,
    appliesTo: ["emergency-approval"]
  },
  {
    id: "rag-oss-access",
    title: "Production OSS/NMS Access Boundary",
    source: "AI Agent Access Control Policy",
    excerpt: "Sandboxed agents must use synthetic inventory fixtures unless production lookup is explicitly approved.",
    confidence: 0.98,
    appliesTo: ["denied-oss-lookup"]
  },
  {
    id: "rag-neighbor",
    title: "Neighbor Relation Update Standard",
    source: "RAN Mobility Optimization Guide",
    excerpt: "Neighbor-list edits within vendor schema and rollback rules can proceed through standard validation.",
    confidence: 0.9,
    appliesTo: ["safe-neighbor-update"]
  }
];

export const scenarios: Scenario[] = [
  {
    id: "safe-neighbor-update",
    label: "Safe Neighbor-List Update",
    shortLabel: "Safe Update",
    risk: "low",
    description: "A standards-compliant neighbor relation update for a non-critical n41 site.",
    change: {
      id: "CHG-1001",
      scenarioId: "safe-neighbor-update",
      title: "Add approved neighbor relation",
      siteId: "DAL-N41-118",
      source: "PR",
      parameter: "neighborCells",
      before: "DAL-N41-119",
      after: "DAL-N41-119,DAL-N41-120",
      timestamp: "2026-04-27T10:13:00-05:00",
      requestedBy: "ran-automation",
      rollbackPlan: true
    }
  },
  {
    id: "n78-power-drift",
    label: "n78 Transmit-Power Drift",
    shortLabel: "Power Drift",
    risk: "high",
    description: "A Midwest n78 change raises transmit power above the approved regional cap.",
    change: {
      id: "CHG-1002",
      scenarioId: "n78-power-drift",
      title: "Increase n78 transmit power",
      siteId: "CHI-N78-042",
      source: "change-queue",
      parameter: "transmitPowerDbm",
      before: 34,
      after: 41,
      timestamp: "2026-04-27T10:16:00-05:00",
      requestedBy: "rf-ops-midwest",
      rollbackPlan: true
    }
  },
  {
    id: "emergency-approval",
    label: "Emergency-Services Site Change",
    shortLabel: "Emergency Approval",
    risk: "critical",
    description: "A protected LTE overlay serving emergency coverage needs elevated review.",
    change: {
      id: "CHG-1003",
      scenarioId: "emergency-approval",
      title: "Retune protected emergency overlay",
      siteId: "NYC-B66-009",
      source: "PR",
      parameter: "handoverThresholdDb",
      before: -108,
      after: -116,
      timestamp: "2026-04-27T10:22:00-05:00",
      requestedBy: "metro-ran-team",
      rollbackPlan: true
    }
  },
  {
    id: "denied-oss-lookup",
    label: "Denied Production OSS/NMS Lookup",
    shortLabel: "OSS Lookup",
    risk: "medium",
    description: "The agent attempts a production lookup and is redirected to approved fixtures.",
    change: {
      id: "CHG-1004",
      scenarioId: "denied-oss-lookup",
      title: "Validate live inventory before merge",
      siteId: "SEA-N258-017",
      source: "staging-feed",
      parameter: "inventorySource",
      before: "synthetic-fixture",
      after: "prod-oss",
      timestamp: "2026-04-27T10:27:00-05:00",
      requestedBy: "network-platform",
      rollbackPlan: true
    }
  },
  {
    id: "missing-rollback",
    label: "Missing Rollback Plan",
    shortLabel: "No Rollback",
    risk: "high",
    description: "A RAN change is otherwise valid but lacks required rollback metadata.",
    change: {
      id: "CHG-1005",
      scenarioId: "missing-rollback",
      title: "Update handover threshold without rollback",
      siteId: "CHI-N78-042",
      source: "PR",
      parameter: "handoverThresholdDb",
      before: -105,
      after: -111,
      timestamp: "2026-04-27T10:31:00-05:00",
      requestedBy: "rf-ops-midwest",
      rollbackPlan: false
    }
  }
];
