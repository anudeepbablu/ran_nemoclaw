#!/usr/bin/env node
// Synthetic cell-state inventory simulator. Substitutes for a production
// OSS read when the sandbox boundary refuses the real call. Returns a
// deterministic snapshot keyed off the scenario fixtures.
//
// Usage: node scripts/openshell/sim-inventory.js --site CHI-N78-042

import { scenarios } from "../../server/data/fixtures.js";

const args = parseArgs(process.argv.slice(2));
const siteId = args.site || args.s;
if (!siteId) {
  process.stderr.write("sim-inventory: missing --site <id>\n");
  process.exit(2);
}

const scenario = scenarios.find((s) => s.site === siteId);
if (!scenario) {
  process.stderr.write(`sim-inventory: no fixture for site ${siteId}\n`);
  process.exit(3);
}

const cacheAgeHours = 23;
const cacheAgeMin = 41;

process.stdout.write(
  [
    `internal-cache hit (synthetic)`,
    `  site=${siteId}`,
    `  vendor=${scenario.vendor} band=${scenario.band}`,
    `  region=${scenario.region}`,
    `  cache_age=${cacheAgeHours}h${cacheAgeMin}m`,
    `  source=ran-rag/cache/${siteId.toLowerCase()}.json`
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
