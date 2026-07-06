// Models the constrained LLM route classifier that runs only after the
// deterministic stages miss. The crucial property is structural: RouteDecision
// has NO write/action variant, so — exactly like the function schema a real LLM
// would be given — this stage is INCAPABLE of mutating the clinical record. The
// worst a mis-route can do is open the wrong screen or defer to the Coach (which
// re-runs the full safety gate). The implementation here is a deterministic mock
// standing in for the model, in the same spirit as MockHealthAiProvider.
export type RouteDecision =
  | { kind: "navigate"; href: string; confidence: number }
  | { kind: "coach"; confidence: number }
  | { kind: "clarify"; candidates: string[]; confidence: number };

export interface RouteClassifier {
  classify(utterance: string, allowedHrefs: readonly string[]): RouteDecision;
}

const ROUTE_SYNONYMS: Record<string, string[]> = {
  "/numbers": ["blood pressure", "bp", "pressure", "reading", "readings", "vitals", "numbers"],
  "/medicines": ["medicine", "medication", "meds", "pill", "pills", "prescription", "prescriptions", "dose", "doses"],
  "/food": ["food", "eat", "eating", "meal", "meals", "diet", "nutrition", "snack"],
  "/plan": ["care plan", "my plan", "goals"],
  "/visits": ["visit", "visits", "appointment", "appointments", "checkup"],
  "/chat": ["coach"],
  "/checkin": ["mood", "check in", "check-in", "how i feel", "how i'm feeling"],
  "/support": ["support", "resource", "resources", "rent", "housing", "utilities", "food stamps"],
  "/intake": ["add instructions", "paste", "upload instructions"],
  "/privacy": ["privacy", "my data", "delete my", "export my", "download my"]
};

export const CLASSIFIER_HREFS: readonly string[] = Object.keys(ROUTE_SYNONYMS);

const QUESTION_START = /^(why|what|how|should|could|would|does|is|are|when|do)\b/;
const CONCERN = /\b(confus|understand|worried|worry|scared|nervous|explain)/;

export const mockRouteClassifier: RouteClassifier = {
  classify(utterance, allowedHrefs) {
    const text = utterance.toLowerCase().trim();

    // Deliberately conservative: a question or an expression of concern belongs
    // with the Coach, not a feature screen.
    if (QUESTION_START.test(text) || CONCERN.test(text) || text.endsWith("?")) {
      return { kind: "coach", confidence: 0.3 };
    }

    const matches = allowedHrefs
      .map((href) => ({ href, score: (ROUTE_SYNONYMS[href] ?? []).filter((syn) => text.includes(syn)).length }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    if (matches.length === 0) {
      return { kind: "coach", confidence: 0.3 };
    }

    if (matches.length > 1 && matches[1].score === matches[0].score) {
      return {
        kind: "clarify",
        candidates: matches.filter((entry) => entry.score === matches[0].score).map((entry) => entry.href),
        confidence: 0.5
      };
    }

    return { kind: "navigate", href: matches[0].href, confidence: 0.8 };
  }
};
