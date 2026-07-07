import type { DrGrade, DrReportExtraction, ExtractionRefusal } from "@/domain/types";

// Client + server validator for the env-gated live extraction route. The model
// is never trusted: anything outside this exact shape parses to null and the
// caller falls back to the deterministic refusal path.
const GRADES: DrGrade[] = ["no_dr", "mild_npdr", "moderate_npdr", "severe_npdr", "pdr"];
const REFUSALS: ExtractionRefusal[] = ["not_a_report", "retinal_photograph", "unreadable"];

export function parseExtractionPayload(raw: unknown): DrReportExtraction | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;

  const grade = value.grade === null || GRADES.includes(value.grade as DrGrade) ? ((value.grade ?? null) as DrGrade | null) : undefined;
  if (grade === undefined) {
    return null;
  }
  const dmePresent =
    value.dmePresent === null || typeof value.dmePresent === "boolean" ? ((value.dmePresent ?? null) as boolean | null) : undefined;
  if (dmePresent === undefined) {
    return null;
  }
  if (typeof value.ungradable !== "boolean") {
    return null;
  }
  if (value.confidence !== "high" && value.confidence !== "medium" && value.confidence !== "low") {
    return null;
  }
  const fieldsRead = Array.isArray(value.fieldsRead)
    ? value.fieldsRead.filter((line): line is string => typeof line === "string").slice(0, 12)
    : null;
  if (fieldsRead === null) {
    return null;
  }
  const refusal =
    value.refusal === undefined ? undefined : REFUSALS.includes(value.refusal as ExtractionRefusal) ? (value.refusal as ExtractionRefusal) : null;
  if (refusal === null) {
    return null;
  }

  // A graded extraction with no refusal must actually carry a grade or be
  // ungradable — a null-grade "success" would let the UI confirm nothing.
  if (!refusal && !value.ungradable && grade === null) {
    return null;
  }

  return { grade, dmePresent, ungradable: value.ungradable, confidence: value.confidence, fieldsRead, ...(refusal ? { refusal } : {}) };
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Live photo extraction via the server route that holds the key. Returns null
// whenever the route is unconfigured, locked, errors, or replies off-shape —
// the deterministic path owns every fallback.
export async function extractReportViaLiveRoute(
  file: File,
  patientId: string,
  passcode?: string
): Promise<DrReportExtraction | null> {
  const image = await readFileAsDataUrl(file);
  if (!image || !image.startsWith("data:image/")) {
    return null;
  }

  try {
    const response = await fetch("/api/screening/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, passcode, image })
    });
    const data = (await response.json()) as { mode?: string; extraction?: unknown };
    if (data.mode !== "extraction") {
      return null;
    }
    return parseExtractionPayload(data.extraction);
  } catch {
    return null;
  }
}
