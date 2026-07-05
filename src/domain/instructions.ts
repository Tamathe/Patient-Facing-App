import type { CareContextItem, ExtractedFact } from "./types";

export function extractInstructionFacts(item: CareContextItem): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const text = item.rawText.toLowerCase();

  if (text.includes("monitor bp") || text.includes("blood pressure") || text.includes("bp daily")) {
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

  if (text.includes("continue") && text.includes("lisinopril")) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Medication instruction",
      value: "Continue lisinopril as prescribed",
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["Continue lisinopril", "lisinopril"])
    });
  }

  if (text.includes("follow up") || text.includes("follow-up")) {
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
