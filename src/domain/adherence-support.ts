import type { AiMode, Medication, MedicationBarrier } from "./types";

export type BarrierSupport = {
  mode: AiMode;
  prompt: string;
  linkLabel: string;
  reassurance?: string;
  href: string;
};

const aiModes: AiMode[] = ["explain", "today", "why", "ask", "trouble", "visit", "summarize", "food"];

export function parseBarrierSupportQuery(params: { get(name: string): string | null }): {
  mode: AiMode;
  concern: string;
} {
  const requestedMode = params.get("mode");

  return {
    mode: aiModes.find((mode) => mode === requestedMode) ?? "explain",
    concern: params.get("concern")?.trim() ?? ""
  };
}

export function buildBarrierSupport(medication: Medication, barrier: MedicationBarrier): BarrierSupport {
  const support = supportContent(medication, barrier);
  const params = new URLSearchParams({ mode: support.mode, concern: support.prompt });

  return {
    ...support,
    href: `/chat?${params.toString()}`
  };
}

function supportContent(
  medication: Medication,
  barrier: MedicationBarrier
): Omit<BarrierSupport, "href"> {
  switch (barrier) {
    case "forgot":
      return {
        mode: "today",
        prompt: `I forgot my ${medication.name}. Help me make a simple routine for remembering it as prescribed.`,
        linkLabel: "Help me remember"
      };
    case "side_effects":
      return {
        mode: "trouble",
        prompt: `I skipped ${medication.name} because I felt side effects. Help me explain this to my care team.`,
        linkLabel: "Get help with side effects"
      };
    case "does_not_feel_necessary":
      return {
        mode: "why",
        prompt: `Why does ${medication.name} matter even when I feel fine?`,
        linkLabel: "Why it matters",
        reassurance: `${medication.purpose} ${medication.preventionBenefit}`
      };
    case "ran_out":
      return {
        mode: "trouble",
        prompt: `I ran out of ${medication.name}. Help me ask my pharmacy or care team what to do next without changing the dose myself.`,
        linkLabel: "Get refill help"
      };
    case "cost":
      return {
        mode: "trouble",
        prompt: `The cost of ${medication.name} is getting in the way. Help me ask about lower-cost ways to stay on my prescribed plan.`,
        linkLabel: "Get cost help"
      };
    case "confused":
      return {
        mode: "trouble",
        prompt: `I am confused about ${medication.name}. Help me organize what to ask my care team.`,
        linkLabel: "Help me make a question"
      };
    case "scared":
      return {
        mode: "trouble",
        prompt: `I feel scared about taking ${medication.name}. Help me explain my concern to my care team.`,
        linkLabel: "Talk through my concern"
      };
    case "pharmacy_issue":
      return {
        mode: "trouble",
        prompt: `A pharmacy problem is keeping me from getting ${medication.name}. Help me ask my pharmacy or care team for the next step.`,
        linkLabel: "Get pharmacy help"
      };
  }
}
