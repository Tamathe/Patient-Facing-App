import { classifySafety } from "@/domain/safety";
import { findRecentClinicalReading } from "@/domain/recent-clinical-reading";
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

function mentionsSideEffectConcern(input: string): boolean {
  return /side effect|dizz|lightheaded|faint|swelling|rash|nausea|cough|made me feel|felt worse/i.test(input);
}

export async function createSafeAiResponse(
  request: HealthAiRequest,
  provider: HealthAiProvider
): Promise<HealthAiResponse> {
  const inputSafety = classifySafety(request.patientInput);
  let stateBlockingReadingSafety: HealthAiResponse | undefined;
  const latestReading = getLatestReading(request.state.readings);
  const medicationWithSideEffects = findMedicationWithSideEffects(request.state.medications);
  const recentClinicalReading = findRecentClinicalReading(request.state.readings, request.state.carePlan, {
    includeBlockedNotes: true
  });

  if (recentClinicalReading) {
    const { reading, bloodPressureInsight, noteSafety, numericSafety } = recentClinicalReading;

    if (noteSafety.level === "escalate") {
      return {
        content: noteSafety.response,
        safety: "escalate",
        sources: [reading.id]
      };
    }

    if (bloodPressureInsight.escalation === "clinic") {
      return {
        content: `${bloodPressureInsight.message} If you are feeling worse, seek urgent care now.`,
        safety: "escalate",
        sources: [reading.id, request.state.carePlan.id]
      };
    }

    if (numericSafety.level === "escalate") {
      return {
        content: numericSafety.response,
        safety: "escalate",
        sources: [reading.id]
      };
    }

    if (noteSafety.level === "blocked") {
      stateBlockingReadingSafety = {
        content: noteSafety.response,
        safety: noteSafety.level,
        sources: [reading.id]
      };
    }
  }

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
  }

  if (inputSafety.level === "escalate") {
    return {
      content: inputSafety.response,
      safety: inputSafety.level,
      sources: []
    };
  }

  if (medicationWithSideEffects && mentionsSideEffectConcern(request.patientInput)) {
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
