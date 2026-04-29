#!/usr/bin/env node
// Apply an approved RAN config change against the synthetic config store.
// This is the post-validator "execute" step — only runs when the validator
// has issued an Allowed verdict. The bridge will refuse to invoke this
// script if the verdict is anything else.
//
// Usage: node scripts/openshell/apply-change.js --change CHG-1001

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scenarios } from "../../server/data/fixtures.js";

const args = parseArgs(process.argv.slice(2));
const changeId = args.change || args.c;
if (!changeId) {
  process.stderr.write("apply-change: missing --change <id>\n");
  process.exit(2);
}

const scenario = scenarios.find((s) => s.chg === changeId);
if (!scenario) {
  process.stderr.write(`apply-change: unknown change ${changeId}\n`);
  process.exit(3);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "data", "applied");
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = join(outDir, `${scenario.chg.toLowerCase()}-${stamp}.json`);
writeFileSync(
  path,
  JSON.stringify(
    {
      change: scenario.chg,
      site: scenario.site,
      vendor: scenario.vendor,
      band: scenario.band,
      diff: scenario.diff,
      applied_at: new Date().toISOString()
    },
    null,
    2
  )
);

process.stdout.write(
  [
    `applied change ${scenario.chg} to synthetic config store`,
    `  site=${scenario.site}`,
    `  ops=${scenario.diff.length}`,
    `  record=${path.replace(here.replace(/\/scripts\/openshell$/, ""), "")}`
  ].join("\n") + "\n"
);
process.exit(0);

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
