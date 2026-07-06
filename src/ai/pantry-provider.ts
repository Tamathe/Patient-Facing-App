import { buildPantryPrompt } from "./food-instructions";
import { activeConditions, selectLenses } from "@/domain/condition-lens";
import { pantryResultSchema } from "@/domain/schemas";
import { t } from "@/i18n/strings";
import type { AppState, HomeReading, PantryRecipe } from "@/domain/types";
import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";

type VisionRouteResponse =
  | { mode: "answer"; content: string }
  | { mode: "unconfigured" }
  | { mode: "locked" }
  | { mode: "error"; message?: string };

// Fixed benign utterance so the pantry scan still flows through decideSafety in
// createSafeAiResponse (crisis + reading escalation) exactly like a spoken turn.
export const PANTRY_REQUEST_TEXT = "What can I cook from what's in my pantry right now?";

function latestReadingId(readings: HomeReading[]): string | null {
  if (readings.length === 0) {
    return null;
  }
  return [...readings].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0].id;
}

// Same grounding citation discipline as the vision provider: always cite the care
// plan; cite the latest reading too so any general "for your blood-pressure plan"
// phrasing in a recipe rationale clears the clinical-adjacent citation check.
function groundingCitations(state: AppState): string[] {
  const readingId = latestReadingId(state.readings);
  return readingId ? [state.carePlan.id, readingId] : [state.carePlan.id];
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// The plain-text digest the grounding verifier reads. This MUST include every
// free-text string the recipe card renders (detected items, title, whyItFits,
// haveItems, buyItems, and especially watchOut — the caution field is where
// diagnosis- or med-change-shaped language is most likely). Anything the card shows
// but this omits would reach the patient without passing the safety backstop.
function summarize(detectedItems: string[], recipes: PantryRecipe[]): string {
  const parts: string[] = [];
  if (detectedItems.length > 0) {
    parts.push(`In the pantry: ${detectedItems.join(", ")}.`);
  }
  for (const recipe of recipes) {
    const bits = [`${recipe.title}: ${recipe.whyItFits}`];
    if (recipe.haveItems.length > 0) {
      bits.push(`Uses ${recipe.haveItems.join(", ")}.`);
    }
    if (recipe.buyItems.length > 0) {
      bits.push(`To pick up: ${recipe.buyItems.join(", ")}.`);
    }
    if (recipe.watchOut) {
      bits.push(recipe.watchOut);
    }
    parts.push(bits.join(" "));
  }
  return parts.join(" ");
}

// The pantry-recipe path. respond() calls the shared vision route in JSON mode; the
// result is still wrapped by createSafeAiResponse (crisis + grounding) at the call
// site, and the structured recipes ride along on the response. Falls back to a plain
// message when the model is unavailable or the completion cannot be parsed.
export class PantryProvider implements HealthAiProvider {
  private readonly passcode?: string;

  constructor(options: { passcode?: string } = {}) {
    this.passcode = options.passcode;
  }

  async respond(request: HealthAiRequest): Promise<HealthAiResponse> {
    const { state } = request;
    const lens = selectLenses(activeConditions(state.carePlan));
    const sources = groundingCitations(state);

    let route: VisionRouteResponse;
    try {
      const response = await fetch("/api/food/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: state.patient.id,
          passcode: this.passcode,
          question: "List the pantry items you see and suggest recipes as JSON.",
          system: buildPantryPrompt(state, lens),
          image: request.image ?? null,
          json: true,
          maxTokens: 900
        })
      });
      route = (await response.json()) as VisionRouteResponse;
    } catch {
      route = { mode: "error", message: "fetch_failed" };
    }

    const language = state.patient.language;
    if (route.mode === "locked") {
      return { content: t(language, "pantryLocked"), safety: "allowed", sources };
    }
    if (route.mode !== "answer") {
      return { content: t(language, "pantryUnavailable"), safety: "allowed", sources };
    }

    const parsed = pantryResultSchema.safeParse(safeJsonParse(route.content));
    if (!parsed.success || parsed.data.recipes.length === 0) {
      return { content: t(language, "pantryNoFood"), safety: "allowed", sources };
    }

    const { detectedItems, recipes } = parsed.data;
    return {
      content: summarize(detectedItems, recipes),
      safety: "allowed",
      sources,
      detectedItems,
      recipes
    };
  }
}
