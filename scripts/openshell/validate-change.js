#!/usr/bin/env node
// Run the policy/validation suite for a change. Prints pass/fail summary
// per rule, plus a risk score and proposed verdict. The agent's
// `runValidationTests` tool routes through this via OpenShell.
//
// Usage: node scripts/openshell/validate-change.js --change CHG-1002

import { scenarios } from "../../server/data/fixtures.js";
import { validate } from "../../server/agent/policy.js";

const args = parseArgs(process.argv.slice(2));
const changeId = args.change || args.c;
if (!changeId) {
  process.stderr.write("validate-change: missing --change <id>\n");
  process.exit(2);
}

const scenario = scenarios.find((s) => s.chg === changeId);
if (!scenario) {
  process.stderr.write(`validate-change: unknown change ${changeId}\n`);
  process.exit(3);
}

const counts = countVerdicts(scenario.rules);
const verdict = validate(scenario.rules);

const lines = [
  `${counts.pass} pass · ${counts.skip} skip · ${counts.fail} fail${
    counts.pending > 0 ? ` · ${counts.pending} pending` : ""
  }`
];

for (const r of scenario.rules) {
  if (r.verdict === "fail" || r.verdict === "pending") {
    lines.push(`  ${r.id} ${r.verdict}: ${r.input}`);
  }
}

lines.push(`risk_score=${scenario.risk}/100`);
lines.push(`verdict=${verdict}`);

process.stdout.write(lines.join("\n") + "\n");
process.exit(0);

function countVerdicts(rules) {
  return rules.reduce(
    (acc, r) => {
      acc[r.verdict] = (acc[r.verdict] || 0) + 1;
      return acc;
    },
    { pass: 0, skip: 0, fail: 0, pending: 0 }
  );
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}
