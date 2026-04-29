import raw from "../../data/fixtures.json";
import type { QueueItem, Scenario } from "../types";

const data = raw as { scenarios: Scenario[]; queueItems: QueueItem[] };

export const scenarios: Scenario[] = data.scenarios;
export const queueItems: QueueItem[] = data.queueItems;
