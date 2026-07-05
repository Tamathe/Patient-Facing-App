import { classifySafety } from "@/domain/safety";
import { findRecentClinicalReading } from "@/domain/recent-clinical-reading";
import { inferAiMode } from "./intent";
import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";
import type { AiMessageAction, HomeReading, Medication } from "@/domain/types";

const CARE_TEAM_ACTIONS: AiMessageAction[] = ["call_clinic", "draft_message"];

type SafetyDecision =
  | { kind: "hard_escalate"; message: string; sources: string[] }
  | { kind: "soft_escalate"; message: string; sources: string[] }
  | { kind: "soft_block"; message: string; sources: string[] }
  | { kind: "allowed" };

function getLatestReading(readings: HomeReading[]): HomeReading | undefined {
  if (readings.length === 0) {
    return undefined;
  }

  return [...readings].sort((a, b) => new Date(b.measuredAt).valueOf() - new Date(a.measuredAt).valueOf())[0];
}

function findMedicationWithSideEffects(medications: Medication[]): Medication | undefined {
  return medications.find((medication) => medication.activeBarriers.includes("side_effects"));
}

function mentionsSideEffectConcern(input: string): boolean {
  return /side effect|dizz|lightheaded|faint|swelling|rash|nausea|cough|made me feel|felt worse/i.test(input);
}

function dedupe(sources: string[]): string[] {
  return [...new Set(sources)];
}

// Decides the highest-priority safety outcome for a request. The priority order is
// preserved from the original gate: urgent symptoms and dangerous vitals are "hard"
// (the escalation is the whole answer); clinic-threshold readings and dose-change
// requests are "soft" (still answer the question, but attach a prominent banner).
function decideSafety(request: HealthAiRequest): SafetyDecision {
  const inputSafety = classifySafety(request.patientInput);
  const latestReading = getLatestReading(request.state.readings);
  const medicationWithSideEffects = findMedicationWithSideEffects(request.state.medications);
  const recentClinicalReading = findRecentClinicalReading(request.state.readings, request.state.carePlan, {
    includeBlockedNotes: true
  });
  let softBlock: SafetyDecision | undefined;

  if (recentClinicalReading) {
    const { reading, bloodPressureInsight, noteSafety, numericSafety } = recentClinicalReading;

    if (noteSafety.level === "escalate") {
      return { kind: "hard_escalate", message: noteSafety.response, sources: [reading.id] };
    }

    if (bloodPressureInsight.escalation === "clinic") {
      return {
        kind: "soft_escalate",
        message: `${bloodPressureInsight.message} This can happen even when you feel fine. If you are feeling worse, seek urgent care now.`,
        sources: [reading.id, request.state.carePlan.id]
      };
    }

    if (numericSafety.level === "escalate") {
      return { kind: "hard_escalate", message: numericSafety.response, sources: [reading.id] };
    }

    if (noteSafety.level === "blocked") {
      softBlock = { kind: "soft_block", message: noteSafety.response, sources: [reading.id] };
    }
  }

  if (latestReading) {
    const noteSafety = classifySafety(latestReading.note);

    if (noteSafety.level === "escalate") {
      return { kind: "hard_escalate", message: noteSafety.response, sources: [latestReading.id] };
    }

    if (noteSafety.level === "blocked") {
      softBlock = { kind: "soft_block", message: noteSafety.response, sources: [latestReading.id] };
    }
  }

  if (inputSafety.level === "escalate") {
    return { kind: "hard_escalate", message: inputSafety.response, sources: [] };
  }

  if (medicationWithSideEffects && mentionsSideEffectConcern(request.patientInput)) {
    return {
      kind: "hard_escalate",
      message: `${medicationWithSideEffects.name} is marked with active side effects. I cannot diagnose the cause, but I can help you contact your care team and share this symptom pattern with the latest readings.`,
      sources: [medicationWithSideEffects.id]
    };
  }

  if (softBlock) {
    return softBlock;
  }

  if (inputSafety.level === "blocked") {
    return { kind: "soft_block", message: inputSafety.response, sources: [] };
  }

  return { kind: "allowed" };
}

export async function createSafeAiResponse(
  request: HealthAiRequest,
  provider: HealthAiProvider
): Promise<HealthAiResponse> {
  const decision = decideSafety(request);

  // Hard escalations are emergencies: the escalation is the whole answer and the
  // provider is never called, so we cannot generate a normal reply alongside it.
  if (decision.kind === "hard_escalate") {
    return {
      content: decision.message,
      safety: "escalate",
      sources: decision.sources,
      actions: CARE_TEAM_ACTIONS
    };
  }

  const effectiveRequest: HealthAiRequest = {
    ...request,
    mode: inferAiMode(request.patientInput, request.mode)
  };
  const providerResponse = await provider.respond(effectiveRequest);

  // Soft cases still answer the question, but carry the safety guidance as a prominent
  // banner plus actionable ways to reach the care team.
  if (decision.kind === "soft_escalate" || decision.kind === "soft_block") {
    return {
      content: providerResponse.content,
      safety: decision.kind === "soft_escalate" ? "escalate" : "blocked",
      sources: dedupe([...decision.sources, ...providerResponse.sources]),
      banner: decision.message,
      actions: CARE_TEAM_ACTIONS
    };
  }

  if (providerResponse.safety === "blocked" || providerResponse.safety === "escalate") {
    return providerResponse;
  }

  return { ...providerResponse, safety: "allowed" };
}
