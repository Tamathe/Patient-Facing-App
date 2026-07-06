import { describe, expect, it } from "vitest";
import { decideFrontDoor } from "./front-door";
import { crisisGateCorpus } from "./crisis-red-flags.corpus";
import { CLASSIFIER_HREFS } from "./route-classifier";
import { MENU_GROUPS } from "@/components/menu-grid";
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

  it("tags a safety coach distinctly from a no-match coach, so only no-match reaches the LLM", () => {
    const crisis = decideFrontDoor("I want to die", en);
    const question = decideFrontDoor("what should I make for dinner tonight really", en);
    expect(crisis).toMatchObject({ kind: "coach", reason: "safety" });
    expect(question).toMatchObject({ kind: "coach", reason: "no_match" });
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

describe("decideFrontDoor — constrained classifier stage", () => {
  it("uses the classifier to bridge a synonym the lexicon misses", () => {
    expect(decideFrontDoor("take me to my prescription list", en)).toMatchObject({ kind: "navigate", href: "/medicines" });
  });

  it("still defers a concern to the Coach rather than a screen", () => {
    expect(decideFrontDoor("my prescriptions are confusing me", en).kind).toBe("coach");
  });

  it("never emits anything but coach or navigate — the front door cannot write", () => {
    const samples = ["log my blood pressure", "show my medicines", "why does this matter", "I want to die", "random gibberish", "take me to my prescriptions"];
    for (const sample of samples) {
      expect(["coach", "navigate"], `"${sample}"`).toContain(decideFrontDoor(sample, en).kind);
    }
  });

  it("keeps the classifier route set in lockstep with the menu (no dead destinations)", () => {
    const menuRoutes = new Set(MENU_GROUPS.flatMap((group) => group.items.map((item) => item.href)));
    expect(new Set(CLASSIFIER_HREFS)).toEqual(menuRoutes);
  });
});

describe("decideFrontDoor — Spanish", () => {
  it("routes Spanish commands deterministically for Spanish patients", () => {
    expect(decideFrontDoor("muéstrame mis medicinas", es)).toMatchObject({ kind: "navigate", href: "/medicines" });
    expect(decideFrontDoor("registré mi presión", es)).toMatchObject({ kind: "navigate", href: "/numbers" });
    expect(decideFrontDoor("comida", es)).toMatchObject({ kind: "navigate", href: "/food" });
  });

  it("does not match the English lexicon for a Spanish patient", () => {
    expect(decideFrontDoor("show my medicines", es).kind).toBe("coach");
  });

  it("still routes crisis text to the Coach for a Spanish patient", () => {
    expect(decideFrontDoor("I want to die", es)).toMatchObject({ kind: "coach", reason: "safety" });
  });
});
