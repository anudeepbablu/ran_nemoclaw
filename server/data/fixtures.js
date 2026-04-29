// Single source of truth for the bridge: imports the same JSON the UI uses.
// Keeps scenarios + queue items in lock-step across the language boundary.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, "..", "..", "data", "fixtures.json");
const raw = JSON.parse(readFileSync(path, "utf8"));

export const scenarios = raw.scenarios;
export const queueItems = raw.queueItems;

export function getScenario(id) {
  return scenarios.find((s) => s.id === id);
}
