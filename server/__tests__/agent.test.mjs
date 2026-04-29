import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scenarios } from "../data/fixtures.js";
import { validate } from "../agent/policy.js";
import { scripts } from "../agent/scripts.mjs";
import {
  finalizeRecommendation,
  proposePolicyDecision,
  recordAudit,
  searchRagCorpus,
  toolRegistry,
  toolSchemas
} from "../agent/tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const runnerPath = join(repoRoot, "server", "agent", "runner.mjs");

describe("server/agent/policy.js", () => {
  it("JS validator agrees with hardcoded scenario decision on every fixture", () => {
    for (const s of scenarios) {
      expect(validate(s.rules), `scenario ${s.id}`).toBe(s.decision);
    }
  });
});

describe("server/agent/tools.mjs", () => {
  it("searchRagCorpus returns scoped chunks for the requested scenario", () => {
    const r = searchRagCorpus({
      scenarioId: "power-drift",
      query: "midwest power cap"
    });
    expect(r.ok).toBe(true);
    expect(r.rag.length).toBeGreaterThan(0);
    expect(r.rag[0].id).toMatch(/POL-RAN-/);
  });

  it("proposePolicyDecision routes through validator and detects override", () => {
    const r = proposePolicyDecision({
      scenarioId: "power-drift",
      proposed: "Allowed",
      rationale: "test"
    });
    expect(r.ok).toBe(true);
    expect(r.proposed).toBe("Allowed");
    expect(r.verdict).toBe("Denied");
    expect(r.overrode).toBe(true);
    expect(r.risk).toBe(78);
  });

  it("proposePolicyDecision agrees with LLM when proposal matches reality", () => {
    const r = proposePolicyDecision({
      scenarioId: "safe-update",
      proposed: "Allowed",
      rationale: "test"
    });
    expect(r.verdict).toBe("Allowed");
    expect(r.overrode).toBe(false);
  });

  it("recordAudit appends a stamped entry", () => {
    const r = recordAudit({ actor: "NemoClaw", summary: "smoke" });
    expect(r.ok).toBe(true);
    expect(r.audit[0].actor).toBe("NemoClaw");
    expect(r.audit[0].summary).toBe("smoke");
    expect(r.audit[0].t).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("finalizeRecommendation echoes text", () => {
    const r = finalizeRecommendation({ text: "approve with caveats" });
    expect(r.ok).toBe(true);
    expect(r.recommendation).toBe("approve with caveats");
  });

  it("tool registry contains all 9 tools and the schemas match", () => {
    const expected = [
      "inspectConfigChange",
      "runValidationTests",
      "queryInventory",
      "fetchVendorSchema",
      "applyChange",
      "searchRagCorpus",
      "proposePolicyDecision",
      "recordAudit",
      "finalizeRecommendation"
    ];
    for (const name of expected) {
      expect(typeof toolRegistry[name], name).toBe("function");
    }
    expect(toolSchemas.map((s) => s.function.name).sort()).toEqual(
      expected.slice().sort()
    );
  });
});

describe("server/agent/scripts.mjs", () => {
  it("every scenario has a script", () => {
    for (const s of scenarios) {
      expect(scripts[s.id], s.id).toBeTruthy();
    }
  });

  it("every script step references a registered tool", () => {
    for (const [scenarioId, steps] of Object.entries(scripts)) {
      for (const step of steps) {
        expect(toolRegistry[step.tool], `${scenarioId} → ${step.tool}`).toBeTruthy();
      }
    }
  });

  it("every script ends with finalizeRecommendation", () => {
    for (const [scenarioId, steps] of Object.entries(scripts)) {
      const last = steps[steps.length - 1];
      expect(last.tool, scenarioId).toBe("finalizeRecommendation");
    }
  });
});

describe("server/agent/runner.mjs (smoke)", () => {
  // Spawning the runner per scenario verifies the entire NDJSON pipeline
  // end-to-end: tool calls, event emission, and the final run.complete.
  // We use the safe-update scenario because applyChange writes to
  // data/applied; the test gitignores that dir and the write is idempotent.
  it.each([
    ["safe-update", "Allowed"],
    ["power-drift", "Denied"],
    ["emergency", "Approval"],
    ["oss-lookup", "Denied"],
    ["no-rollback", "Denied"]
  ])(
    "scenario %s emits run.complete with verdict %s",
    async (scenarioId, expectedVerdict) => {
      const events = await runScenario(scenarioId);

      const start = events.find((e) => e.kind === "run.started");
      expect(start, "run.started").toBeTruthy();
      expect(start.scenarioId).toBe(scenarioId);

      const verdict = events.find((e) => e.kind === "policy.verdict");
      expect(verdict, "policy.verdict").toBeTruthy();
      expect(verdict.decision).toBe(expectedVerdict);

      const recommendation = events.find((e) => e.kind === "recommendation");
      expect(recommendation, "recommendation").toBeTruthy();

      const complete = events.find((e) => e.kind === "run.complete");
      expect(complete, "run.complete").toBeTruthy();
      expect(complete.verdict).toBe(expectedVerdict);

      // Every scenario produces shell events (at least inspect + validate).
      expect(events.some((e) => e.kind === "shell")).toBe(true);

      // Policy rules should have populated.
      const policyEvents = events.filter((e) => e.kind === "policy");
      expect(policyEvents.length).toBeGreaterThan(0);
    },
    20_000
  );

  it("power-drift run records overrode=false (LLM proposal matches validator)", async () => {
    const events = await runScenario("power-drift");
    const verdict = events.find((e) => e.kind === "policy.verdict");
    expect(verdict.overrode).toBe(false);
    expect(verdict.proposed).toBe("Denied");
  });
});

function runScenario(scenarioId) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [runnerPath, "--scenario", scenarioId],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(
          new Error(
            `runner exited with code ${code}\nstderr: ${stderr}\nstdout tail: ${stdout.slice(-500)}`
          )
        );
        return;
      }
      try {
        const events = stdout
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .map((l) => JSON.parse(l));
        resolve(events);
      } catch (err) {
        reject(
          new Error(
            `failed to parse runner stdout: ${err.message}\nstdout: ${stdout.slice(0, 2000)}`
          )
        );
      }
    });
    child.on("error", reject);
  });
}
