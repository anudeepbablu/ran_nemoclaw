import { useCallback, useEffect, useState } from "react";
import { queueItems, scenarios } from "../data/fixtures";
import { validate } from "../policy/validator";
import type { Decision, Scenario, ScenarioId } from "../types";

export type ScenarioRunner = {
  scenarios: Scenario[];
  scenario: Scenario;
  scenarioId: ScenarioId;
  setScenarioId: (id: ScenarioId) => void;
  tlIdx: number;
  shellIdx: number;
  running: boolean;
  run: () => void;
  reset: () => void;
  decision: Decision;
  forcedVerdict: Decision | null;
  setForcedVerdict: (v: Decision | null) => void;
  queue: typeof queueItems;
  pulseTick: number;
};

export function useScenarioRunner(
  initialId: ScenarioId,
  demoSpeed = 1,
  ambient = true
): ScenarioRunner {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(initialId);
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  const [tlIdx, setTlIdx] = useState(scenario.timeline.length);
  const [shellIdx, setShellIdx] = useState(scenario.openshell.length);
  const [running, setRunning] = useState(false);
  const [forcedVerdict, setForcedVerdict] = useState<Decision | null>(null);
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    if (!ambient) return;
    const id = window.setInterval(() => setPulseTick((t) => t + 1), 2400);
    return () => window.clearInterval(id);
  }, [ambient]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let i = 0;
    let j = 0;
    setTlIdx(0);
    setShellIdx(0);
    const speed = Math.max(0.2, demoSpeed || 1);
    const step = () => {
      if (cancelled) return;
      if (i < scenario.timeline.length) {
        i += 1;
        setTlIdx(i);
        window.setTimeout(step, 380 / speed + (Math.random() * 240) / speed);
      } else if (j < scenario.openshell.length) {
        j += 1;
        setShellIdx(j);
        window.setTimeout(step, 480 / speed + (Math.random() * 320) / speed);
      } else {
        setRunning(false);
      }
    };
    window.setTimeout(step, 280 / speed);
    return () => {
      cancelled = true;
    };
  }, [running, scenario, demoSpeed]);

  const run = useCallback(() => setRunning(true), []);
  const reset = useCallback(() => {
    setRunning(false);
    setTlIdx(scenario.timeline.length);
    setShellIdx(scenario.openshell.length);
  }, [scenario]);

  useEffect(() => {
    setRunning(false);
    setTlIdx(scenario.timeline.length);
    setShellIdx(scenario.openshell.length);
  }, [scenarioId, scenario.timeline.length, scenario.openshell.length]);

  const decision = forcedVerdict ?? validate(scenario.rules);

  return {
    scenarios,
    scenario,
    scenarioId,
    setScenarioId,
    tlIdx,
    shellIdx,
    running,
    run,
    reset,
    decision,
    forcedVerdict,
    setForcedVerdict,
    queue: queueItems,
    pulseTick
  };
}
