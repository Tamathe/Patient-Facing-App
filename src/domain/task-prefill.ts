import type { AiMode, AppState, HomeReading } from "./types";
import { findRecentClinicalReading } from "./recent-clinical-reading";

export type TaskPrefill = { mode: AiMode; input: string };

function latestReading(readings: HomeReading[]): HomeReading | undefined {
  if (readings.length === 0) {
    return undefined;
  }
  return [...readings].sort((left, right) => new Date(right.measuredAt).valueOf() - new Date(left.measuredAt).valueOf())[0];
}

// Maps a deep-linked task chip to the exact patient message the chat should
// submit on its behalf. The message is treated as real patient input: it
// re-enters createSafeAiResponse, so the reading's own numbers and note are
// re-screened and a dangerous reading still hard-escalates. This is the single
// code path shared by a tapped chip and a tapped notification (/chat?taskId=…).
export function prefilledMessageForTask(taskId: string, state: AppState): TaskPrefill | null {
  if (taskId === "task-bp-clinical") {
    const clinical = findRecentClinicalReading(state.readings, state.carePlan, { includeBlockedNotes: true });
    const reading = clinical?.reading ?? latestReading(state.readings);
    if (!reading) {
      return { mode: "explain", input: "I have a blood pressure reading I want to talk through with my care team." };
    }
    const noteSentence = reading.note.trim().length > 0 ? ` I also noted: ${reading.note.trim()}.` : "";
    return {
      mode: "explain",
      input: `My most recent home blood pressure reading was ${reading.systolic}/${reading.diastolic}.${noteSentence} What should I do?`
    };
  }

  if (taskId === "task-med-barrier") {
    return {
      mode: "explain",
      input: "I'm having trouble with one of my medicines and want to tell my care team what got in the way."
    };
  }

  return null;
}
