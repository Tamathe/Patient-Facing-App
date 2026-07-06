import { describe, expect, it } from "vitest";
import { brentState, demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import { collectSourceFacts } from "./grounding-facts";

function knownSourceIds(state: AppState): Set<string> {
  const ids = new Set<string>();
  ids.add(state.carePlan.id);
  state.carePlan.goals.forEach((goal) => ids.add(goal.id));
  state.medications.forEach((medication) => ids.add(medication.id));
  state.readings.forEach((reading) => ids.add(reading.id));
  state.contextItems.forEach((item) => ids.add(item.id));
  state.extractedFacts.forEach((fact) => ids.add(fact.id));
  return ids;
}

describe("collectSourceFacts", () => {
  it("emits exactly the known app source ids for brentState", () => {
    const factIds = new Set(collectSourceFacts(brentState).map((fact) => fact.id));
    expect(factIds).toEqual(knownSourceIds(brentState));
  });

  it("emits exactly the known app source ids for demoState", () => {
    const factIds = new Set(collectSourceFacts(demoState).map((fact) => fact.id));
    expect(factIds).toEqual(knownSourceIds(demoState));
  });

  it("carries the care-plan threshold and diabetes context as grounding values", () => {
    const facts = collectSourceFacts(brentState);
    const plan = facts.find((fact) => fact.id === brentState.carePlan.id);
    const context = facts.find((fact) => fact.sourceKind === "context_item");

    expect(plan?.value).toContain("160/100");
    expect(facts.some((fact) => /type 2 diabetes/i.test(fact.value))).toBe(true);
    expect(context).toBeDefined();
  });

  it("marks confirmed facts and medications as patientConfirmed", () => {
    const confirmedState: AppState = {
      ...brentState,
      extractedFacts: brentState.extractedFacts.map((fact, index) =>
        index === 0 ? { ...fact, status: "confirmed" } : fact
      ),
      medications: brentState.medications.map((medication, index) =>
        index === 0 ? { ...medication, source: "confirmed" } : medication
      )
    };

    const facts = collectSourceFacts(confirmedState);
    const confirmedFact = facts.find((fact) => fact.id === confirmedState.extractedFacts[0].id);
    const confirmedMed = facts.find((fact) => fact.id === confirmedState.medications[0].id);

    expect(confirmedFact?.patientConfirmed).toBe(true);
    expect(confirmedMed?.patientConfirmed).toBe(true);
  });
});
