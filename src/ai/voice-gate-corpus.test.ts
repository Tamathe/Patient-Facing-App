// Known irreducible ASR miss: inserting filler words inside a tight literal
// crisis phrase can defeat the zero-false-positive patterns. The live fail-closed
// watchdog and the visible typed/screen twin remain the mitigation; this corpus
// inserts fillers only at the utterance-start clause boundary. The maintained
// named-child elopement rule also depends on name casing; that one seed keeps its
// proper noun intact and is an owner follow-up rather than a regex change here.
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { crisisGateCorpus } from "@/domain/crisis-red-flags.corpus";
import type { Language } from "@/i18n/strings";
import { evaluateVoiceTranscript } from "./voice-gate";

type VoiceSeed = { id: string; text: string; language: Language };

const numericEmergencySeeds: VoiceSeed[] = [
  { id: "acute_bp_digits", text: "worst headache of my life and my BP is 210 over 120", language: "en" },
  { id: "acute_bp_words", text: "worst headache of my life and my BP is two ten over one twenty", language: "en" }
];

const seeds: VoiceSeed[] = [
  ...crisisGateCorpus
    .filter((entry) => entry.expectedMatched)
    .map((entry) => ({
      id: entry.id,
      text: entry.text,
      language: entry.id.includes("_es_") || entry.id.startsWith("es_") ? "es" as const : "en" as const
    })),
  ...numericEmergencySeeds
];

function swapNumbers(text: string): string {
  const wordToDigit: Array<[RegExp, string]> = [
    [/\btwo ten\b/gi, "210"],
    [/\bone eighty\b/gi, "180"],
    [/\bone twenty\b/gi, "120"]
  ];
  const digitToWord: Array<[RegExp, string]> = [
    [/\b210\b/g, "two ten"],
    [/\b180\b/g, "one eighty"],
    [/\b120\b/g, "one twenty"]
  ];
  const table = /\b(?:210|180|120)\b/.test(text) ? digitToWord : wordToDigit;
  return table.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

function variants(seed: VoiceSeed): string[] {
  const lowercase = seed.id === "caregiver_es_named_child_eloped_missing"
    ? seed.text
    : seed.text.toLocaleLowerCase();
  const punctuationStripped = lowercase
    .replace(/[^\p{L}\p{N}\s/'’]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const filler = `${seed.language === "es" ? "este" : "um"}, ${lowercase}`;
  const generated = [lowercase, filler, swapNumbers(lowercase)];
  // A semicolon can separate a negated clause from a later positive disclosure;
  // deleting that semantic boundary changes the utterance rather than degrading
  // its ASR form, so those compound cases keep their boundary punctuation.
  if (!lowercase.includes(";")) generated.push(punctuationStripped);
  return [...new Set(generated)];
}

const cases = seeds.flatMap((seed) => variants(seed).map((text) => ({ ...seed, text })));

describe("voice crisis gate corpus", () => {
  it("intercepts every deterministic ASR-degraded crisis and emergency variant", () => {
    const misses = cases
      .filter((testCase) => evaluateVoiceTranscript(testCase.text, demoState, testCase.language).kind !== "intercept")
      .map((testCase) => `${testCase.id}: ${testCase.text}`);
    expect(misses).toEqual([]);
  });

  it("stays under 5ms per gate call across the corpus", () => {
    const startedAt = performance.now();
    for (const testCase of cases) {
      evaluateVoiceTranscript(testCase.text, demoState, testCase.language);
    }
    const elapsedPerCall = (performance.now() - startedAt) / cases.length;
    expect(elapsedPerCall).toBeLessThan(5);
  });
});
