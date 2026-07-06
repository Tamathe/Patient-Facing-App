import type { HomeReading, IdentifiedFood, Medication } from "@/domain/types";
import type {
  HealthAiProvider,
  HealthAiRequest,
  HealthAiResponse,
  LiveSessionHandle,
  LiveSessionInit,
  LiveSessionStatus
} from "./types";

const ACE_ARB_NAMES = [
  "lisinopril",
  "enalapril",
  "ramipril",
  "benazepril",
  "losartan",
  "valsartan",
  "olmesartan",
  "spironolactone",
  "eplerenone",
  "amiloride",
  "triamterene"
];

const SALT_SUBSTITUTE_PATTERN = /salt substitute|lite salt|potassium chloride|no.?salt/i;

function findAceInhibitor(medications: Medication[]): Medication | null {
  return (
    medications.find((medication) =>
      ACE_ARB_NAMES.some((name) => medication.name.toLowerCase().includes(name))
    ) ?? null
  );
}

function getLatestReadingId(readings: HomeReading[]): string | null {
  if (readings.length === 0) {
    return null;
  }
  return [...readings].sort(
    (a, b) => new Date(b.measuredAt).valueOf() - new Date(a.measuredAt).valueOf()
  )[0].id;
}

function buildFoodAnswer(food: IdentifiedFood | undefined, aceMedication: Medication | null): string {
  if (!food) {
    return "Point your camera at a food's barcode and I can look up the details and tell you how it fits your plan.";
  }

  const label = food.brand ? `${food.brand} ${food.name}` : food.name;
  const sodium = food.nutrition?.sodiumMg ?? null;
  const parts: string[] = [];

  if (sodium !== null) {
    const percent = Math.round((sodium / 1500) * 100);
    parts.push(`${label} has ${sodium} mg of sodium — about ${percent}% of your daily target.`);
    if (percent >= 30) {
      parts.push("That is a lot in one serving, and your recent readings are trending up, so a lower-sodium option would be a better pick.");
    }
  } else {
    parts.push(`I could not read the sodium for ${label}, so treat this as an estimate.`);
  }

  const potassium = food.nutrition?.potassiumMg ?? null;
  const looksLikeSaltSubstitute = SALT_SUBSTITUTE_PATTERN.test(`${label} ${food.category ?? ""}`);
  if (aceMedication && (looksLikeSaltSubstitute || (potassium !== null && potassium >= 400))) {
    parts.push(`Because you take ${aceMedication.name}, check with your care team before using high-potassium salt substitutes.`);
  }

  return parts.join(" ");
}

export class MockHealthAiProvider implements HealthAiProvider {
  async respond(request: HealthAiRequest): Promise<HealthAiResponse> {
    const lowercasedInput = request.patientInput.toLowerCase();
    const requestedMedication = request.state.medications.find((medication) =>
      lowercasedInput.includes(medication.name.toLowerCase())
    );
    const hasSingleMedication = request.state.medications.length === 1;
    const medication = requestedMedication ?? (hasSingleMedication ? request.state.medications[0] : null);

    if (request.mode === "food") {
      const content = buildFoodAnswer(request.identifiedFood, findAceInhibitor(request.state.medications));
      const sources = [request.state.carePlan.id];
      // The trend sentence cites the readings it summarizes, so grounding sees the
      // reading behind "your recent readings are trending up".
      if (/recent readings are trending up/i.test(content)) {
        const latestReadingId = getLatestReadingId(request.state.readings);
        if (latestReadingId) {
          sources.push(latestReadingId);
        }
      }
      return {
        content,
        safety: "allowed",
        sources
      };
    }

    if (request.mode === "why") {
      if (!medication && !hasSingleMedication) {
        return {
          content:
            "I see multiple medications in your plan. Please tell me which one you mean, for example by name, and I can explain that one.",
          safety: "allowed",
          sources: []
        };
      }

      if (medication) {
        return {
          content: `${medication.name} is listed in your medicines as: ${medication.purpose} ${medication.preventionBenefit} ${medication.safetyNote}`,
          safety: "allowed",
          sources: [medication.id]
        };
      }
    }

    if (request.mode === "visit") {
      return {
        content:
          "Bring your recent home readings, any missed doses, side effects, and the top question you want answered. Your plan says the next visit is to review readings and medication barriers.",
        safety: "allowed",
        sources: [request.state.carePlan.id]
      };
    }

    return {
      content: "I can help explain your plan, prepare questions, summarize readings, or organize what to share with your care team.",
      safety: "allowed",
      sources: [request.state.carePlan.id]
    };
  }

  async openLiveSession(init: LiveSessionInit): Promise<LiveSessionHandle> {
    let status: LiveSessionStatus = "listening";
    let closed = false;

    const emit = init.onEvent;
    emit({ type: "status", status: "listening" });

    const speak = (text: string) => {
      if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
        return;
      }
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = init.language === "es" ? "es-ES" : "en-US";
        window.speechSynthesis.speak(utterance);
      } catch {
        // speech synthesis is best-effort in the mock session
      }
    };

    const handle: LiveSessionHandle = {
      sendUserText: (text: string) => {
        if (closed) {
          return;
        }
        status = "thinking";
        emit({ type: "userTranscript", text, final: true });
        emit({ type: "status", status: "thinking" });

        const context = init.getContext();
        void this.respond({
          mode: "food",
          patientInput: text,
          state: init.getState(),
          identifiedFood: context.identifiedFood ?? undefined,
          image: context.frameDataUrl ?? undefined
        }).then((response) => {
          if (closed) {
            return;
          }
          status = "speaking";
          emit({ type: "assistantTranscript", text: response.content, final: true });
          emit({ type: "status", status: "speaking" });
          speak(response.content);
          status = "listening";
          emit({ type: "status", status: "listening" });
        });
      },
      updateInstructions: () => {
        // no-op in the mock session
      },
      close: () => {
        if (closed) {
          return;
        }
        closed = true;
        status = "closed";
        if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }
        }
        emit({ type: "status", status: "closed" });
      },
      getStatus: () => status
    };

    return handle;
  }
}
