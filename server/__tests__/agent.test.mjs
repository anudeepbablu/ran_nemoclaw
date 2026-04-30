import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runLLM } from "../agent/agent-loop.mjs";
import { makeClient } from "../agent/nemotron.mjs";
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

describe("server/agent/nemotron.mjs", () => {
  it("makeClient sends bearer auth and JSON body to the configured base URL", async () => {
    const captured = { url: null, init: null };
    const fakeFetch = async (url, init) => {
      captured.url = url;
      captured.init = init;
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { role: "assistant", content: "ok", tool_calls: [] } }]
          };
        }
      };
    };
    const client = makeClient({
      fetchImpl: fakeFetch,
      env: {
        OPENSHELL_INFERENCE_URL: "https://inference.local/v1/",
        OPENSHELL_INFERENCE_MODEL: "test-model",
        NVIDIA_API_KEY: "test-key"
      }
    });
    await client.chat({
      messages: [{ role: "user", content: "hi" }],
      tools: []
    });
    expect(captured.url).toBe("https://inference.local/v1/chat/completions");
    expect(captured.init.method).toBe("POST");
    expect(captured.init.headers["Authorization"]).toBe("Bearer test-key");
    expect(JSON.parse(captured.init.body).model).toBe("test-model");
  });

  it("makeClient omits Authorization when no API key is set", async () => {
    let captured = null;
    const fakeFetch = async (_, init) => {
      captured = init;
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { role: "assistant", content: "" } }] };
        }
      };
    };
    const client = makeClient({
      fetchImpl: fakeFetch,
      env: { OPENSHELL_INFERENCE_URL: "https://x/v1" }
    });
    await client.chat({ messages: [], tools: [] });
    expect(captured.headers["Authorization"]).toBeUndefined();
  });
});

describe("server/agent/agent-loop.mjs (LLM mode with mocked Nemotron)", () => {
  it("dispatches a full happy-path tool sequence and reaches finalize", async () => {
    const events = [];
    const emitted = [];
    const emit = (e) => events.push(e);
    const emitForResult = (name, result) => emitted.push({ name, result });

    // Pre-canned LLM responses: each call returns one tool_call. The loop
    // ends when finalizeRecommendation is called.
    const calls = [
      makeToolCall("inspectConfigChange", { changeId: "CHG-1002" }),
      makeToolCall("searchRagCorpus", {
        scenarioId: "power-drift",
        query: "n78 power"
      }),
      makeToolCall("runValidationTests", { changeId: "CHG-1002" }),
      makeToolCall("proposePolicyDecision", {
        scenarioId: "power-drift",
        proposed: "Allowed", // intentionally wrong → validator overrides
        rationale: "test"
      }),
      makeToolCall("recordAudit", { actor: "TestAgent", summary: "smoke" }),
      makeToolCall("finalizeRecommendation", { text: "test recommendation" })
    ];
    let i = 0;
    const fakeChat = async () => {
      const message = {
        role: "assistant",
        content: null,
        tool_calls: calls[i] ? [calls[i]] : []
      };
      i++;
      return { choices: [{ message }] };
    };

    const result = await runLLM({
      scenario: scenarios.find((s) => s.id === "power-drift"),
      emit,
      emitForResult,
      client: { chat: fakeChat }
    });

    expect(result.finalized).toBe(true);
    expect(result.verdict).toBe("Denied");
    const toolNames = emitted.map((e) => e.name);
    expect(toolNames).toEqual([
      "inspectConfigChange",
      "searchRagCorpus",
      "runValidationTests",
      "proposePolicyDecision",
      "recordAudit",
      "finalizeRecommendation"
    ]);
    const propose = emitted.find((e) => e.name === "proposePolicyDecision").result;
    expect(propose.overrode).toBe(true); // validator overrode the LLM
    expect(propose.proposed).toBe("Allowed");
    expect(propose.verdict).toBe("Denied");
  });

  it("max-iterations halts a runaway loop", async () => {
    // The fake LLM never calls finalizeRecommendation; loop must give up.
    const fakeChat = async () => ({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [makeToolCall("recordAudit", { actor: "X", summary: "y" })]
          }
        }
      ]
    });
    const result = await runLLM({
      scenario: scenarios.find((s) => s.id === "safe-update"),
      emit: () => {},
      emitForResult: () => {},
      client: { chat: fakeChat },
      maxIterations: 3
    });
    expect(result.finalized).toBe(false);
  });

  it("applyChange refuses when verdict is not Allowed (defense-in-depth)", async () => {
    let proposeResult;
    const calls = [
      makeToolCall("proposePolicyDecision", {
        scenarioId: "power-drift",
        proposed: "Denied",
        rationale: "bad change"
      }),
      // LLM ignores the verdict and tries to apply anyway. Tool refuses.
      makeToolCall("applyChange", { changeId: "CHG-1002" }),
      makeToolCall("finalizeRecommendation", { text: "denied" })
    ];
    let i = 0;
    const fakeChat = async () => ({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: calls[i] ? [calls[i++]] : []
          }
        }
      ]
    });
    const emitted = [];
    await runLLM({
      scenario: scenarios.find((s) => s.id === "power-drift"),
      emit: () => {},
      emitForResult: (n, r) => {
        emitted.push({ name: n, result: r });
        if (n === "proposePolicyDecision") proposeResult = r;
      },
      client: { chat: fakeChat }
    });
    const apply = emitted.find((e) => e.name === "applyChange");
    expect(apply.result.ok).toBe(false);
    expect(apply.result.shell[0].status).toBe("denied");
    expect(proposeResult.verdict).toBe("Denied");
  });
});

function makeToolCall(name, args) {
  return {
    id: `call_${name}_${Math.random().toString(16).slice(2, 8)}`,
    type: "function",
    function: { name, arguments: JSON.stringify(args) }
  };
}

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
