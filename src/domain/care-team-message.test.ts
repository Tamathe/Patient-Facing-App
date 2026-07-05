import { describe, expect, it } from "vitest";
import { buildCareTeamMessage } from "./care-team-message";
import { demoState } from "./fixtures";
import type { MedicationBarrier } from "./types";

describe("buildCareTeamMessage", () => {
  it("includes recent readings, the medicine, and a question for the care team", () => {
    const message = buildCareTeamMessage(demoState);

    expect(message).toContain("care team");
    expect(message).toContain("Lisinopril");
    expect(message).toContain("149/94");
    expect(message).toContain("My question:");
  });

  it("adds humanized barrier context when barriers are set", () => {
    const state = {
      ...demoState,
      medications: [
        {
          ...demoState.medications[0],
          activeBarriers: ["side_effects", "forgot"] as MedicationBarrier[]
        }
      ]
    };

    const message = buildCareTeamMessage(state);

    expect(message).toContain("Feels side effects");
    expect(message).not.toContain("side_effects");
  });
});
