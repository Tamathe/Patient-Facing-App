import type { FamilyNavigatorState } from "./types";

export const morganFamilyState: FamilyNavigatorState = {
  profile: {
    childFirstName: "Riley",
    birthYear: 2017,
    schoolStage: "elementary",
    county: "Scott",
    diagnoses: [
      { id: "morgan-diagnosis-dyslexia", label: "dyslexia", diagnosedAt: "2026-05" },
      { id: "morgan-diagnosis-adhd", label: "adhd", diagnosedAt: "2026-05" }
    ]
  },
  interviewDraft:
    "My daughter is in fourth grade in Georgetown. She was just diagnosed with dyslexia and ADHD a couple months ago. Reading homework is a nightly battle and I don't know what to ask the school for. Money's tight and I keep hearing about waivers but have no idea where to start.",
  screenAnswers: [],
  interviews: [],
  facts: [],
  latestInterviewDomains: [],
  activeDomains: [],
  saved: [],
  alreadyEnrolled: []
};

export const caseyFamilyState: FamilyNavigatorState = {
  profile: {
    birthYear: 2024,
    schoolStage: "not_school_age",
    county: "Perry",
    diagnoses: [{ id: "casey-diagnosis-speech-language", label: "speech_language" }]
  },
  interviewDraft:
    "My child is 2 and has speech and language delays. I want to get started with First Steps before the third birthday and find local therapy help.",
  screenAnswers: [],
  interviews: [],
  facts: [],
  latestInterviewDomains: [],
  activeDomains: [],
  saved: [],
  alreadyEnrolled: []
};

export function eighteenMonthFamilyState(now: Date): FamilyNavigatorState {
  if (Number.isNaN(now.valueOf())) {
    throw new RangeError("A valid timestamp is required for the 18-month family example.");
  }
  const birth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 18, 1));
  return {
    profile: {
      childFirstName: "Avery",
      birthYear: birth.getUTCFullYear(),
      birthMonth: birth.getUTCMonth() + 1,
      schoolStage: "not_school_age",
      county: "Fayette",
      diagnoses: []
    },
    interviewDraft: "",
    screenAnswers: [],
    interviews: [],
    facts: [],
    latestInterviewDomains: [],
    activeDomains: [],
    saved: [],
    alreadyEnrolled: []
  };
}
