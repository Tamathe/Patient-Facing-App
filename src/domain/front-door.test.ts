import { describe, expect, it } from "vitest";
import { decideFrontDoor } from "./front-door";
import { crisisGateCorpus } from "./crisis-red-flags.corpus";
import { demoState } from "./fixtures";
import type { AppState } from "./types";

const en: AppState = demoState;
const es: AppState = { ...demoState, patient: { ...demoState.patient, language: "es" } };

describe("decideFrontDoor — safety first", () => {
  it("never routes a crisis-corpus positive to a feature screen", () => {
    const positives = crisisGateCorpus.filter((c) => c.expectedMatched);
    for (const c of positives) {
      const route = decideFrontDoor(c.text, en);
      expect(route.kind, `"${c.text}" must go to the Coach`).toBe("coach");
    }
  });

  it("routes dangerous readings and med-change requests to the Coach, not a feature", () => {
    expect(decideFrontDoor("my blood pressure is 190 over 120", en).kind).toBe("coach");
    expect(decideFrontDoor("should I stop taking my lisinopril", en).kind).toBe("coach");
    expect(decideFrontDoor("I have no food today", en).kind).toBe("coach");
  });
});

describe("decideFrontDoor — deterministic navigation (English)", () => {
  it("lands a write verb on the real feature screen (form commits, not a silent write)", () => {
    expect(decideFrontDoor("log my blood pressure", en)).toMatchObject({ kind: "navigate", href: "/numbers" });
    expect(decideFrontDoor("check if I took my medicine this morning", en)).toMatchObject({ kind: "navigate", href: "/medicines" });
  });

  it("navigates on an explicit nav verb or a short destination phrase", () => {
    expect(decideFrontDoor("show my visits", en)).toMatchObject({ kind: "navigate", href: "/visits" });
    expect(decideFrontDoor("food", en)).toMatchObject({ kind: "navigate", href: "/food" });
    expect(decideFrontDoor("open support", en)).toMatchObject({ kind: "navigate", href: "/support" });
  });

  it("sends a genuine question to the Coach rather than a keyword screen", () => {
    expect(decideFrontDoor("why does my medicine even matter if I feel fine?", en).kind).toBe("coach");
  });
});

describe("decideFrontDoor — Spanish gate", () => {
  it("skips the English lexicon for Spanish patients and always reaches the Coach", () => {
    expect(decideFrontDoor("show my medicines", es).kind).toBe("coach");
    expect(decideFrontDoor("food", es).kind).toBe("coach");
  });

  it("still routes a Spanish patient's crisis text to the Coach", () => {
    expect(decideFrontDoor("I want to die", es).kind).toBe("coach");
  });
});
