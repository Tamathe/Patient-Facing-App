import { describe, expect, it } from "vitest";
import { buildCareTeamMessage, latestPatientConcern } from "./care-team-message";
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

  it("includes the patient's normalized submitted concern", () => {
    const message = buildCareTeamMessage(
      demoState,
      "  The cost of Lisinopril\n is getting in the way.  "
    );

    expect(message).toContain("- What I want help with: The cost of Lisinopril is getting in the way.");
    expect(message).not.toContain("\n is getting");
  });

  it("keeps the default question when the submitted concern is blank", () => {
    const message = buildCareTeamMessage(demoState, "   \n  ");

    expect(message).toContain("- My question: I want to talk about whether my plan is working");
    expect(message).not.toContain("What I want help with:");
  });

  it("selects only the latest submitted patient concern", () => {
    const state = {
      ...demoState,
      aiMessages: [
        {
          id: "patient-old",
          mode: "why" as const,
          role: "patient" as const,
          content: "Why does this matter?",
          createdAt: "2026-07-20T12:00:00.000Z",
          safety: "allowed" as const,
          sources: []
        },
        {
          id: "assistant-newer",
          mode: "why" as const,
          role: "assistant" as const,
          content: "Here is why.",
          createdAt: "2026-07-20T12:01:00.000Z",
          safety: "allowed" as const,
          sources: []
        },
        {
          id: "patient-latest",
          mode: "trouble" as const,
          role: "patient" as const,
          content: "Cost is getting in the way.",
          createdAt: "2026-07-20T12:02:00.000Z",
          safety: "allowed" as const,
          sources: []
        }
      ]
    };

    expect(latestPatientConcern(state)).toBe("Cost is getting in the way.");
    expect(latestPatientConcern({ ...demoState, aiMessages: [] })).toBeUndefined();
  });
});
