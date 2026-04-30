// Nemotron tool-calling loop.
//
// Runs the agent for one scenario by orchestrating Nemotron + the
// toolRegistry. Emits the same AgentEvent stream as the scripted runner
// — the UI doesn't know whether the events came from a real LLM or from
// scripts.mjs.
//
// The deterministic Policy Engine validator (server/agent/policy.js) is
// the authoritative verdict. proposePolicyDecision routes the LLM's
// proposal through it and reports `overrode` whenever they disagree.
// Apply-side guards in tools.mjs prevent a Denied/Approval change from
// being executed even if the LLM mistakenly tries.

import { makeClient } from "./nemotron.mjs";
import { toolRegistry, toolSchemas } from "./tools.mjs";

const MAX_ITERATIONS = 15;

export async function runLLM({
  scenario,
  emit,
  emitForResult,
  client = makeClient(),
  maxIterations = MAX_ITERATIONS
}) {
  const messages = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: userPrompt(scenario) }
  ];

  let lastVerdict = null;
  let finalized = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    const response = await client.chat({
      messages,
      tools: toolSchemas,
      toolChoice: "auto"
    });

    const choice = response?.choices?.[0];
    if (!choice) {
      throw new Error("Nemotron returned no choices");
    }
    const assistant = choice.message;
    messages.push(assistant);

    const toolCalls = assistant.tool_calls || [];
    if (toolCalls.length === 0) {
      // No more tool calls; treat as end-of-run.
      break;
    }

    for (const call of toolCalls) {
      const name = call.function?.name;
      const tool = toolRegistry[name];
      if (!tool) {
        appendToolResult(messages, call, {
          ok: false,
          error: `unknown tool: ${name}`
        });
        continue;
      }

      const args = parseArgs(call.function.arguments);

      // applyChange must see the validator's verdict, not the LLM's
      // proposal. If the LLM forgets to pass verdict, fill it in.
      if (name === "applyChange" && !args.verdict && lastVerdict) {
        args.verdict = lastVerdict;
      }

      let result;
      try {
        result = await tool(args);
      } catch (err) {
        result = {
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        };
      }

      emitForResult(name, result);
      if (name === "proposePolicyDecision" && result.ok) {
        lastVerdict = result.verdict;
      }
      if (name === "finalizeRecommendation" && result.ok) {
        finalized = true;
      }

      appendToolResult(messages, call, sanitizeForLLM(result));
    }

    if (finalized) break;
  }

  return { verdict: lastVerdict ?? "Denied", finalized };
}

// ─── prompts ──────────────────────────────────────────────────────────────

function systemPrompt() {
  return `You are the NemoClaw RAN drift guard. You evaluate a proposed RAN configuration change inside an OpenShell-governed sandbox.

You have access to nine tools. Use them in roughly this order:
1. inspectConfigChange — parse the change descriptor
2. searchRagCorpus — pull relevant internal policy + runbook chunks
3. runValidationTests — get per-rule verdicts and risk score from the deterministic Policy Engine
4. queryInventory or fetchVendorSchema — only when the scenario requires fresh evidence; some calls will be denied or marked approval-required by the sandbox boundary, that is expected and should not stop you
5. proposePolicyDecision — submit your verdict (Allowed / Denied / Approval) with rationale; the deterministic validator runs and may override
6. applyChange — only when the validator's verdict is Allowed
7. recordAudit — append a one-line audit entry
8. finalizeRecommendation — produce the final remediation text and end the run

Hard rules:
- The deterministic Policy Engine has final authority. When proposePolicyDecision returns a different verdict from yours, the override is visible to operators; align with it.
- Do NOT call applyChange unless the validator returned Allowed.
- Always finish by calling finalizeRecommendation.
- Be terse. Tool calls do the talking; free-text reasoning between calls should be one line at most.`;
}

function userPrompt(scenario) {
  return `Evaluate this change.

  scenarioId: ${scenario.id}
  change:     ${scenario.chg}
  site:       ${scenario.site}
  vendor:     ${scenario.vendor}
  band:       ${scenario.band}
  region:     ${scenario.region}
  severity:   ${scenario.severity}
  summary:    ${scenario.summary}

Begin.`;
}

// ─── helpers ──────────────────────────────────────────────────────────────

function parseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Trims a tool result down to what's useful for the model. We strip the
// shell `out` blob (often kilobytes) and keep just status + summary so
// the conversation stays under context.
function sanitizeForLLM(result) {
  if (!result) return { ok: false };
  const out = { ok: result.ok };
  if (result.error) out.error = result.error;
  if (result.shell) {
    out.shell = result.shell.map((c) => ({
      cmd: c.cmd,
      status: c.status,
      code: c.code,
      durMs: c.dur,
      outPreview: (c.out || "").slice(0, 400)
    }));
  }
  if (result.rag) {
    out.rag = result.rag.map((r) => ({
      id: r.id,
      section: r.section,
      sim: r.sim,
      highlight: r.highlight
    }));
  }
  if (result.audit) out.audit = result.audit;
  if (result.proposed) out.proposed = result.proposed;
  if (result.verdict) out.verdict = result.verdict;
  if (typeof result.overrode === "boolean") out.overrode = result.overrode;
  if (typeof result.risk === "number") out.risk = result.risk;
  if (result.recommendation) out.recommendation = result.recommendation;
  return out;
}

function appendToolResult(messages, call, result) {
  messages.push({
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify(result)
  });
}
