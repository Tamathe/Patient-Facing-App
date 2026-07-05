import { classifySafety } from "@/domain/safety";
import { interpretBloodPressure } from "@/domain/blood-pressure";
import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";
import type { HomeReading, Medication } from "@/domain/types";

function getLatestReading(readings: HomeReading[]): HomeReading | undefined {
  if (readings.length === 0) {
    return undefined;
  }

  return [...readings].sort(
    (a, b) => new Date(b.measuredAt).valueOf() - new Date(a.measuredAt).valueOf()
  )[0];
}

function findMedicationWithSideEffects(medications: Medication[]): Medication | undefined {
  return medications.find((medication) => medication.activeBarriers.includes("side_effects"));
}

export async function createSafeAiResponse(
  request: HealthAiRequest,
  provider: HealthAiProvider
): Promise<HealthAiResponse> {
  const inputSafety = classifySafety(request.patientInput);
  let stateBlockingReadingSafety: HealthAiResponse | undefined;
  const latestReading = getLatestReading(request.state.readings);
  const medicationWithSideEffects = findMedicationWithSideEffects(request.state.medications);

  if (latestReading) {
    const noteSafety = classifySafety(latestReading.note);

    if (noteSafety.level === "escalate") {
      return {
        content: noteSafety.response,
        safety: "escalate",
        sources: [latestReading.id]
      };
    }

    if (noteSafety.level === "blocked") {
      stateBlockingReadingSafety = {
        content: noteSafety.response,
        safety: noteSafety.level,
        sources: [latestReading.id]
      };
    }

    const readingInsight = interpretBloodPressure(latestReading, request.state.readings, request.state.carePlan);
    if (readingInsight.escalation === "clinic") {
      return {
        content: `${readingInsight.message} If you are feeling worse, seek urgent care now.`,
        safety: "escalate",
        sources: [latestReading.id, request.state.carePlan.id]
      };
    }
  }

  if (inputSafety.level === "escalate") {
    return {
      content: inputSafety.response,
      safety: inputSafety.level,
      sources: []
    };
  }

  if (medicationWithSideEffects) {
    return {
      content:
        `${medicationWithSideEffects.name} is marked with active side effects. I cannot diagnose the cause, but I can help you contact your care team and share this symptom pattern with the latest readings.`,
      safety: "escalate",
      sources: [medicationWithSideEffects.id]
    };
  }

  if (stateBlockingReadingSafety) {
    return stateBlockingReadingSafety;
  }

  if (inputSafety.level === "blocked") {
    return {
      content: inputSafety.response,
      safety: inputSafety.level,
      sources: []
    };
  }

  const response = await provider.respond(request);

  if (response.safety === "blocked" || response.safety === "escalate") {
    return response;
  }

  return {
    ...response,
    safety: "allowed"
  };
}
