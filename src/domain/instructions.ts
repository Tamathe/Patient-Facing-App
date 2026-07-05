import type { CareContextItem, ExtractedFact } from "./types";

export function extractInstructionFacts(item: CareContextItem): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const normalizedText = item.rawText.toLowerCase();

  if (isHomeMonitoringInstruction(normalizedText)) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Home monitoring",
      value: "Check blood pressure at home",
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["Monitor BP", "blood pressure", "BP daily"])
    });
  }

  const medicationValue = extractMedicationInstructionValue(item.rawText);
  if (medicationValue) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Medication instruction",
      value: medicationValue,
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["take", "continue"])
    });
  }

  if (isFollowUpInstruction(normalizedText)) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Follow-up timing",
      value: "Follow up with care team",
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["Follow up", "follow-up"])
    });
  }

  if (facts.length === 0) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Needs review",
      value: "The app could not confidently identify a home action",
      confidence: "low",
      status: "needs_review",
      sourceSnippet: item.rawText.slice(0, 180)
    });
  }

  return facts;
}

function findSnippet(text: string, needles: string[]): string {
  const lower = text.toLowerCase();
  const found = needles.find((needle) => lower.includes(needle.toLowerCase()));

  if (!found) {
    return text.slice(0, 180);
  }

  const start = Math.max(0, lower.indexOf(found.toLowerCase()) - 40);
  return text.slice(start, start + 180);
}

function isHomeMonitoringInstruction(text: string): boolean {
  return (
    /\b(?:monitor|check|measure|track)\b[^\n\r.;]*\b(?:blood pressure|bp)\b/.test(text) ||
    /\b(?:blood pressure|bp)\b[^\n\r.;]*\b(?:every|daily|morning|evening)\b/.test(text)
  );
}

function extractMedicationInstructionValue(text: string): string | null {
  const asPrescribedMatch = text.match(/\b(?:take|continue|resume|start)\s+([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,2})\s+as\s+prescribed\b/i);
  if (asPrescribedMatch) {
    return `Take ${asPrescribedMatch[1]} as prescribed`;
  }

  const continueOnlyMatch = text.match(/\b(?:continue)\s+([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*){0,2})\b/i);
  if (continueOnlyMatch && /medication|lisinopril|amlodipine/.test(continueOnlyMatch[1])) {
    return `Continue ${continueOnlyMatch[1].trim()} as prescribed`;
  }

  return null;
}

function isFollowUpInstruction(text: string): boolean {
  return /\bfollow[-\s]?up\b/.test(text);
}
