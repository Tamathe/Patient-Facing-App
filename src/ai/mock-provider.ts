import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";

export class MockHealthAiProvider implements HealthAiProvider {
  async respond(request: HealthAiRequest): Promise<HealthAiResponse> {
    const lowercasedInput = request.patientInput.toLowerCase();
    const requestedMedication = request.state.medications.find((medication) =>
      lowercasedInput.includes(medication.name.toLowerCase())
    );
    const hasSingleMedication = request.state.medications.length === 1;
    const medication = requestedMedication ?? (hasSingleMedication ? request.state.medications[0] : null);

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
}
