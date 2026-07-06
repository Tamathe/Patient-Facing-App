import { classifyCrisis, classifySafety } from "./safety";
import { screenSocialEmergency } from "./social-screen";
import { CLASSIFIER_HREFS, mockRouteClassifier, type RouteClassifier } from "./route-classifier";
import type { AppState } from "./types";

export type FrontDoorRoute =
  | { kind: "coach"; ask: string }
  | { kind: "navigate"; href: string; label: string };

// Labels for routes reached via the classifier stage. Kept in lockstep with the
// menu route catalog by front-door.test.ts, so a renamed route can't silently
// produce a dead classifier destination.
const ROUTE_LABELS: Record<string, string> = {
  "/numbers": "My Numbers",
  "/medicines": "My Medicines",
  "/food": "Food",
  "/plan": "My Plan",
  "/visits": "My Visits",
  "/chat": "Coach",
  "/checkin": "Check-in",
  "/support": "Support",
  "/intake": "Add Instructions",
  "/privacy": "Privacy"
};

const CLASSIFIER_CONFIDENCE_FLOOR = 0.75;

type NavRule = { test: RegExp; href: string; label: string };

// Verb rules land the patient on the real feature screen (chat proposes, the
// form commits) — never a silent write. Checked before the broader nav lexicon.
const VERB_RULES: NavRule[] = [
  { test: /\b(log|record|add|enter|save|track)\b.*\b(bp|blood pressure|reading|readings|systolic|pressure)\b/, href: "/numbers", label: "Log a blood pressure reading" },
  { test: /\b(took|take|taken|log|logged|mark)\b.*\b(medicine|medication|meds?|pill|pills|dose)\b/, href: "/medicines", label: "Your medicines" }
];

const NAV_LEXICON: NavRule[] = [
  { test: /\b(numbers|blood pressure|readings)\b/, href: "/numbers", label: "My Numbers" },
  { test: /\b(medicines?|medications?|pills?|meds)\b/, href: "/medicines", label: "My Medicines" },
  { test: /\b(care )?plan\b/, href: "/plan", label: "My Plan" },
  { test: /\b(visits?|appointments?)\b/, href: "/visits", label: "My Visits" },
  { test: /\b(food|meals?|scan)\b/, href: "/food", label: "Food" },
  { test: /\b(check ?in|mood)\b/, href: "/checkin", label: "Check-in" },
  { test: /\b(support|resources?|rent|utilities|food stamps)\b/, href: "/support", label: "Support" },
  { test: /\b(privacy|my data)\b/, href: "/privacy", label: "Privacy" },
  { test: /\b(add instructions|instructions|paste)\b/, href: "/intake", label: "Add Instructions" }
];

const NAV_VERB = /\b(show|open|see|view|go to|take me to|where'?s|where is|bring up|pull up)\b/;

// Deterministic, safety-first front-door router. Order is load-bearing: any
// utterance that trips crisis / urgent-symptom / dangerous-reading / med-change
// / social-emergency screening is handed to the Coach (which re-runs the full
// safety gate and shows crisis UI) and can NEVER be routed to a feature screen.
// Only a "clean" utterance is eligible for the English verb/nav lexicon;
// non-English patients skip the lexicon (gated behind translation) and reach the
// Coach, where the answer path is bilingual. No LLM is involved.
export function decideFrontDoor(
  utterance: string,
  state: AppState,
  classifier: RouteClassifier = mockRouteClassifier
): FrontDoorRoute {
  const text = utterance.trim();

  if (classifyCrisis(text).matched || classifySafety(text).level !== "allowed" || screenSocialEmergency(text)) {
    return { kind: "coach", ask: text };
  }

  if (state.patient.language === "en") {
    const lower = text.toLowerCase();

    for (const rule of VERB_RULES) {
      if (rule.test.test(lower)) {
        return { kind: "navigate", href: rule.href, label: rule.label };
      }
    }

    const isShort = lower.split(/\s+/).filter(Boolean).length <= 3;
    if (NAV_VERB.test(lower) || isShort) {
      for (const rule of NAV_LEXICON) {
        if (rule.test.test(lower)) {
          return { kind: "navigate", href: rule.href, label: rule.label };
        }
      }
    }

    // Final stage: the constrained classifier catches fuzzier phrasings the
    // lexicon missed. It can only navigate or defer — never write — and we act
    // on it only above the confidence floor; everything else reaches the Coach.
    const decision = classifier.classify(text, CLASSIFIER_HREFS);
    if (decision.kind === "navigate" && decision.confidence >= CLASSIFIER_CONFIDENCE_FLOOR) {
      return { kind: "navigate", href: decision.href, label: ROUTE_LABELS[decision.href] ?? decision.href };
    }
  }

  return { kind: "coach", ask: text };
}
