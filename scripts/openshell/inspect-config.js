#!/usr/bin/env node
// Inspect a proposed RAN config change. Reads from data/fixtures.json so
// the output is deterministic per scenario. Designed to be invoked by the
// agent's `inspectConfigChange` tool through OpenShell.
//
// Usage: node scripts/openshell/inspect-config.js --change CHG-1002

import { scenarios } from "../../server/data/fixtures.js";

const args = parseArgs(process.argv.slice(2));
const changeId = args.change || args.c;
if (!changeId) {
  process.stderr.write("inspect-config: missing --change <id>\n");
  process.exit(2);
}

const scenario = scenarios.find((s) => s.chg === changeId);
if (!scenario) {
  process.stderr.write(`inspect-config: unknown change ${changeId}\n`);
  process.exit(3);
}

const ops = scenario.diff.length;
const opSummary = scenario.diff
  .map((d) => `${opLabel(d.op)} ${d.path}`)
  .join(", ");

process.stdout.write(
  [
    `parsed change descriptor`,
    `  change=${scenario.chg}`,
    `  site=${scenario.site}`,
    `  vendor=${scenario.vendor} band=${scenario.band}`,
    `  region=${scenario.region}`,
    `  ops=${ops} (${opSummary})`
  ].join("\n") + "\n"
);
process.exit(0);

function opLabel(op) {
  if (op === "+") return "add";
  if (op === "−") return "remove";
  if (op === "~") return "change";
  return "query";
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
    } else if (a.startsWith("-")) {
      out[a.slice(1)] = argv[i + 1];
      i++;
    }
  }
  return out;
}
