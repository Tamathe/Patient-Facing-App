import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";

export class MockHealthAiProvider implements HealthAiProvider {
  async respond(request: HealthAiRequest): Promise<HealthAiResponse> {
    const lowercasedInput = request.patientInput.toLowerCase();
    const requestedMedication = request.state.medications.find((medication) =>
      lowercasedInput.includes(medication.name.toLowerCase())
    );
    const medication = requestedMedication ?? request.state.medications[0];

    if (request.mode === "why" && medication) {
      return {
        content: `${medication.name} is listed in your medicines as: ${medication.purpose} ${medication.preventionBenefit} ${medication.safetyNote}`,
        safety: "allowed",
        sources: [medication.id]
      };
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
