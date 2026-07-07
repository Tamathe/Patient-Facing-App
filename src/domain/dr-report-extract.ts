import type { DrGrade, DrReportExtraction } from "./types";

// THE CLINICAL LINE: this module reads the camera's printed report — never an
// eye. Unknown input is refused, never guessed, and a filename that looks like
// a retinal photograph gets its own refusal so the UI can say "I can only read
// the printed report, not eye photos."

export const DEMO_REPORT_FILES = [
  "report-no-dr.svg",
  "report-moderate-npdr.svg",
  "report-pdr-dme.svg",
  "report-ungradable.svg"
] as const;

export type DemoReportFile = (typeof DEMO_REPORT_FILES)[number];

const RETINAL_PHOTO_PATTERN = /fundus|retina|eye[-_ ]?photo/i;

const FIXTURE_EXTRACTIONS: Record<string, DrReportExtraction> = {
  "report-no-dr": {
    grade: "no_dr",
    dmePresent: false,
    ungradable: false,
    confidence: "high",
    fieldsRead: [
      "Diabetic retinopathy: No diabetic retinopathy detected",
      "Diabetic macular edema (DME): Not detected",
      "Image quality: Adequate, both eyes",
      "Recommendation: Rescreen in 12 months."
    ]
  },
  "report-moderate-npdr": {
    grade: "moderate_npdr",
    dmePresent: false,
    ungradable: false,
    confidence: "high",
    fieldsRead: [
      "Diabetic retinopathy: Moderate nonproliferative DR (NPDR)",
      "Diabetic macular edema (DME): Not detected",
      "Image quality: Adequate, both eyes",
      "Recommendation: Refer to an eye care professional."
    ]
  },
  "report-pdr-dme": {
    grade: "pdr",
    dmePresent: true,
    ungradable: false,
    confidence: "high",
    fieldsRead: [
      "Diabetic retinopathy: Proliferative DR (PDR)",
      "Diabetic macular edema (DME): Detected",
      "Image quality: Adequate, both eyes",
      "Recommendation: Refer to a retina specialist promptly."
    ]
  },
  "report-ungradable": {
    grade: null,
    dmePresent: null,
    ungradable: true,
    confidence: "high",
    fieldsRead: [
      "Diabetic retinopathy: Unable to grade",
      "Image quality: Insufficient — ungradable images",
      "Recommendation: Repeat imaging."
    ]
  }
};

function refusal(kind: NonNullable<DrReportExtraction["refusal"]>): DrReportExtraction {
  return { grade: null, dmePresent: null, ungradable: false, confidence: "low", fieldsRead: [], refusal: kind };
}

function fileStem(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  return base.replace(/\.[^.]+$/, "").toLowerCase().trim();
}

// Deterministic photo extraction: only the bundled demo report sheets are
// recognized, by filename stem. Everything else refuses.
export function extractFromPhotoName(fileName: string): DrReportExtraction {
  const stem = fileStem(fileName);
  const known = FIXTURE_EXTRACTIONS[stem];
  if (known) {
    return { ...known, fieldsRead: [...known.fieldsRead] };
  }
  if (RETINAL_PHOTO_PATTERN.test(fileName)) {
    return refusal("retinal_photograph");
  }
  return refusal("unreadable");
}

const GRADE_VOCABULARY: Array<{ pattern: RegExp; grade: DrGrade }> = [
  { pattern: /\bno\s+dr\b|\bno\s+diabetic\s+retinopathy\b|\bnone\b/, grade: "no_dr" },
  { pattern: /\bmild\b/, grade: "mild_npdr" },
  { pattern: /\bmoderate\b/, grade: "moderate_npdr" },
  { pattern: /\bsevere\b/, grade: "severe_npdr" },
  { pattern: /\bpdr\b|\bproliferative\b/, grade: "pdr" }
];

const UNGRADABLE_PATTERN = /\bungradable\b|\bunable\s+to\s+grade\b/;
const DME_PATTERN = /\bdme\b|\bmacular\s+edema\b|\bswelling\b/;
const DME_NEGATION_PATTERN = /\b(no|not\s+detected|without)\b[^.]*\b(dme|macular\s+edema|swelling)\b|\b(dme|macular\s+edema|swelling)\b[^.]*\bnot\s+detected\b/;

// Strict typed-entry vocabulary parse. One grade word, optional DME mention,
// or "ungradable" — anything else (including two conflicting grades) refuses.
// Callers MUST run typed free-text through the safety gate before this parser;
// crisis text takes the crisis path, never extraction.
export function extractFromTypedEntry(text: string): DrReportExtraction {
  const normalized = text.toLowerCase().trim();
  if (normalized.length === 0) {
    return refusal("unreadable");
  }

  if (UNGRADABLE_PATTERN.test(normalized)) {
    return {
      grade: null,
      dmePresent: null,
      ungradable: true,
      confidence: "medium",
      fieldsRead: ["Typed entry: ungradable"]
    };
  }

  const gradeMatches = GRADE_VOCABULARY.filter((entry) => entry.pattern.test(normalized));
  if (gradeMatches.length !== 1) {
    return refusal("unreadable");
  }

  const grade = gradeMatches[0].grade;
  const dmeMentioned = DME_PATTERN.test(normalized);
  const dmeNegated = DME_NEGATION_PATTERN.test(normalized);
  const dmePresent = dmeMentioned ? !dmeNegated : null;

  const fieldsRead = [`Typed entry: grade ${grade.replace(/_/g, " ")}`];
  if (dmeMentioned) {
    fieldsRead.push(`Typed entry: macular edema ${dmePresent ? "present" : "not present"}`);
  }

  return { grade, dmePresent, ungradable: false, confidence: "medium", fieldsRead };
}
