import type { AccessibilityPreference, PatientProfile } from "./types";

export interface AccessibilityRenderingProfile {
  ariaLabel: string;
  className: string;
  highContrast: boolean;
  keyboardNavigation: boolean;
  largeText: boolean;
  minTouchTargetPx: number;
  readAloud: boolean;
  screenReader: boolean;
}

export const ACCESSIBILITY_PREFERENCES: AccessibilityPreference[] = [
  "read_aloud",
  "large_text",
  "screen_reader",
  "high_contrast",
  "keyboard_navigation"
];

const ARIA_PREFERENCE_ORDER: AccessibilityPreference[] = [
  "large_text",
  "high_contrast",
  "screen_reader",
  "keyboard_navigation",
  "read_aloud"
];

export const ACCESSIBILITY_PREFERENCE_LABELS: Record<AccessibilityPreference, string> = {
  high_contrast: "high contrast",
  keyboard_navigation: "keyboard",
  large_text: "large text",
  read_aloud: "read aloud",
  screen_reader: "screen reader"
};

function preferencesOf(patient: PatientProfile): AccessibilityPreference[] {
  return patient.accessibilityPreferences ?? [];
}

function hasPreference(patient: PatientProfile, preference: AccessibilityPreference): boolean {
  return preferencesOf(patient).includes(preference);
}

export function accessibilityProfileForPatient(patient: PatientProfile): AccessibilityRenderingProfile {
  const largeText = hasPreference(patient, "large_text");
  const highContrast = hasPreference(patient, "high_contrast");
  const screenReader = hasPreference(patient, "screen_reader");
  const keyboardNavigation = hasPreference(patient, "keyboard_navigation");
  const readAloud = hasPreference(patient, "read_aloud");
  const enabledLabels = ARIA_PREFERENCE_ORDER.filter((preference) => hasPreference(patient, preference)).map(
    (preference) => ACCESSIBILITY_PREFERENCE_LABELS[preference]
  );

  const className = [
    largeText ? "text-[17px] leading-7" : "text-base",
    highContrast ? "contrast-125 [&_.rounded-control]:border-ink/50" : "",
    keyboardNavigation
      ? "[&_:focus-visible]:outline [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-care"
      : ""
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ariaLabel:
      enabledLabels.length > 0 ? `Display with ${enabledLabels.join(", ")} affordances` : "Standard display",
    className,
    highContrast,
    keyboardNavigation,
    largeText,
    minTouchTargetPx: 48,
    readAloud,
    screenReader
  };
}

export function patientAccessibilitySummary(patient: PatientProfile): string {
  const orderedPrefs = ACCESSIBILITY_PREFERENCES.filter((preference) => hasPreference(patient, preference));
  return `language=${patient.language}; prefs=${orderedPrefs.join(",")}`;
}
