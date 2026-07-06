import { describe, expect, it } from "vitest";
import { demoState } from "./fixtures";
import { accessibilityProfileForPatient, patientAccessibilitySummary } from "./accessibility";
import type { PatientProfile } from "./types";

function patientWith(preferences: PatientProfile["accessibilityPreferences"]): PatientProfile {
  return { ...demoState.patient, accessibilityPreferences: preferences };
}

describe("accessibilityProfileForPatient", () => {
  it("maps large_text to the large-text utilities", () => {
    const profile = accessibilityProfileForPatient(patientWith(["large_text"]));
    expect(profile.largeText).toBe(true);
    expect(profile.className).toContain("text-[17px]");
    expect(profile.className).toContain("leading-7");
  });

  it("maps high_contrast to contrast plus strengthened borders", () => {
    const profile = accessibilityProfileForPatient(patientWith(["high_contrast"]));
    expect(profile.highContrast).toBe(true);
    expect(profile.className).toContain("contrast-125");
    expect(profile.className).toContain("border-ink/50");
  });

  it("maps keyboard_navigation to visible focus-ring utilities", () => {
    const profile = accessibilityProfileForPatient(patientWith(["keyboard_navigation"]));
    expect(profile.keyboardNavigation).toBe(true);
    expect(profile.className).toContain("outline-care");
  });

  it("defaults to standard display when no preferences (or missing field)", () => {
    expect(accessibilityProfileForPatient(patientWith([])).className).toContain("text-base");
    const noField = { ...demoState.patient };
    delete noField.accessibilityPreferences;
    const profile = accessibilityProfileForPatient(noField);
    expect(profile.largeText).toBe(false);
    expect(profile.className).toContain("text-base");
  });
});

describe("patientAccessibilitySummary", () => {
  it("lists preferences in canonical order", () => {
    expect(patientAccessibilitySummary(patientWith(["keyboard_navigation", "large_text"]))).toBe(
      "language=en; prefs=large_text,keyboard_navigation"
    );
  });
});
