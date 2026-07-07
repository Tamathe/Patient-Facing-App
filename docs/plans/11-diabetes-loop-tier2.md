# Diabetes Loop — Tier 2 (Med-Timing Overlay + Portion Guessing) — Codex Handoff

**Paste-ready end-to-end handoff for Codex. Execute P0→P4 in order, no per-phase stops. All build work lands in `C:\Patient centered` (Next.js 15 / React 19 / TS strict / Tailwind 3 / useReducer+localStorage / vitest 2 / Playwright, Windows, npm). Solo repo, direct path-scoped commits to `master`. NO push, no PRs.**

**Codex, read this first:**
- Verify with `npm run check` (lint + vitest + build; green with zero env vars) after every phase; `npm run test:e2e` in P4. `npm run crisis:gate` is only needed if you touch a crisis/safety file (you will not).
- **Path-scoped commits only** (`git add <explicit paths>`, never `git add .`/`-A`). One commit per phase, message given.
- **SHARED TREE — do not touch other work.** Another session has uncommitted files in this tree: `src/app/learn/`, `src/components/retinopathy-learn.tsx`, `src/domain/retinopathy-education.*`, and edits to `src/ai/safety-gate.*`, `src/domain/crisis-red-flags.*`, `src/components/teachable-moment-card.tsx`, `src/app/screening/page.tsx`, and `docs/ops/red-team-results/2026-07-07-crisis-gate.md`. **Never `git add` any of those.** Commit only the exact paths each phase names. `npm run check` runs over the whole tree, so it exercises their work too — that is expected and fine.
- TS strict, no `any`, `const` over `let`, no comments on unchanged code. Every new domain lib gets a vitest suite; every new/changed component an RTL test.
- **JSX test quirk:** the test runner uses the classic JSX runtime, so any `.tsx` component **and its `.test.tsx`** must `import React from "react";` at the top (see `src/components/glucose-insights.tsx`). Omitting it fails with "React is not defined".

## Mission

Tier 2 of the Nuna gap analysis (Tier 1 — time-in-range, food↔glucose pattern, diabetes-complete Health Brief — already shipped, plan 10, commits `373d1b5`→`72d321b`). Two more Nuna moments, both derivation-first, no backend, no PHI to any external AI, no diagnosis:

- **#7 — medication-timing overlay on glucose.** Nuna "layers on when you took your medication" over the glucose data. We tag each blood-sugar reading, from the patient's own dose log, with whether the diabetes medicine was taken that day. **Factual overlay, never a causal or statistical claim.**
- **#6 — conversational portion guessing.** Nuna guesses portions ("2 slices, 3 slices") to remove logging work. We parse a serving count from what the patient said and scale the food's nutrition before flags and logging — with the assumption shown and editable.

## Context — the base app today (verified 2026-07-07)

Types (`src/domain/types.ts`):
- `GlucoseReading = { id; patientId; valueMgDl: number; measuredAt: string /* ISO */; contexts: MeasurementContext[]; note: string }`.
- `DoseEvent = { id; patientId; medicationId: string; date: string /* "YYYY-MM-DD" */; status: "taken" | "skipped"; barrier: MedicationBarrier | null; recordedAt: string }`.
- `Medication = { id; name; dose; schedule; … }`.
- `NutritionFacts = { servingSize: string; calories: number|null; sodiumMg; potassiumMg; totalSugarsG; addedSugarsG; saturatedFatG; fiberG; proteinG; carbsG }` (every numeric field is `number | null`).
- `IdentifiedFood = { id; barcode; name; brand; category; nutrition: NutritionFacts | null; source: FoodSource }`.
- `MealLogEntry = { id; patientId; loggedAt; food: IdentifiedFood; flags: string[]; assistantSummary: string }`.

Glucose surface (`src/app/glucose/page.tsx`): renders the log form, the `interpretGlucose` insight, `summarizeGlucoseTrend`, the Tier-1 `GlucoseInsights` (time-in-range + food pattern), and a **Recent readings** list — `state.glucoseReadings.slice(-5).reverse().map(...)` rendering `{valueMgDl} mg/dL` + `new Date(measuredAt).toLocaleString()`. Page copy is **English literal** (not `t()`-wired). This is where #7's tag lands.

Diabetes-med identification: `classifyDiabetesMedication(name)` in `src/domain/pdc-adherence.ts` returns `{ status: "included" | "excluded" | "needs_review", … }`. A medication is a diabetes medicine when `status === "included"` (metformin → included). Reuse this — do not hand-roll a drug list.

Food surface (`src/app/food/page.tsx`): the seam for #6.
- `identifiedFood: IdentifiedFood | null` (from `/api/food/lookup?barcode=` or vision).
- `lens = selectLenses(activeConditions(state.carePlan))`.
- `flags = computeFoodFlags(identifiedFood, lens, { medications, readings }, language)` (`src/domain/food-flags.ts`; `percentOfDailyLimit` scales against `NutritionFacts` numbers).
- `<FoodFactsCard food flags logged canLog onLog language />` (`src/components/food-facts-card.tsx`) shows the food, the flags, and the **Log** button.
- `onLog` → `buildMealLogEntry({ patientId, food: foodRef.current, flags, lastAssistantText, language })` (`src/domain/meal-log.ts`) → `dispatch({ type: "addMealLogEntry", entry })`.
- The patient's typed/spoken utterances arrive via `voice.sendUserText` / `onFinalTranscript` → `appendMessage("patient", text)`; food messages are `state.aiMessages.filter(m => m.mode === "food")`.
- **This surface IS i18n'd:** copy comes from `foodLensStrings` via `t(language, key)` (`src/i18n/strings.ts`, `Language = "en" | "es"`, key union `FoodLensStringKey`). **New patient-facing strings here ship en + es** and extend the `FoodLensStringKey` union + both catalogs (there is a catalog parity test — keep it green).

Diabetes carb reference (unused by Tier 2 but nearby): `diabetesLens` in `src/domain/condition-lens.ts`.

Demo + fixtures: `src/domain/fixtures.ts` `brentState` (diabetes + BP). Metformin (`med-metformin`) dose log: taken 06-27, **skipped 06-29 (cost)**, taken 06-30/07-01/07-03/07-04; **no metformin dose on 07-02**. Glucose readings span 06-29→07-04 including Tier-1's paired post-meal readings. Demo loads via the `/privacy` button **"Load Brent demo (blood pressure + diabetes)"** → `dispatch({ type: "resetDemo", patient: "brent" })`; state persists to localStorage, so navigation keeps it.

Precedents to imitate: Tier-1 pure libs `src/domain/glucose-range.ts` / `glucose-correlation.ts` (+ their `.test.ts`), the prop-driven RTL-tested `src/components/glucose-insights.tsx`, and the e2e `e2e/diabetes-brief.spec.ts`.

## Scope decisions (locked)

1. **#7 is a factual overlay, not statistics.** Tag = "was the diabetes med taken that day, per the dose log." **Never** compute or imply "missing doses raised your sugar" (confounded, and demo data is too thin). The statistical version is a NON-GOAL.
2. **#6 changes no persisted shape.** Do **not** add a field to `MealLogEntry`/`IdentifiedFood`/`AppState`. Parse a servings count in page state, scale a **derived copy** of the nutrition for flags + display + the logged `food`, and reflect the assumption in `servingSize` text (e.g. `"2 × 1 slice (…)"`). No `types.ts`/`storage.ts`/`schemas.ts` change, so no atomic type+guard tripwire.
3. **New pure logic in new files:** `src/domain/glucose-med-context.ts` (#7), `src/domain/portion.ts` (#6). Keep `blood-glucose.ts` (safety-adjacent) and `adherence.ts` untouched.
4. **Language:** #7 lands on the English-literal glucose page → English literal, matching that surface. #6 lands on the i18n'd food page → **en + es** for every new string, and the parser accepts en + es number/unit words.
5. **Deterministic, no new npm dependency, mock-first.** `npm run check` stays green with zero env vars.

## Non-goals (do not build)

- No statistical/causal med-vs-glucose claim; no CGM, no device import, no charting library.
- No new persisted field, no `AppState`/`types.ts`/`storage.ts`/`schemas.ts`/`AuditEvent` change.
- No change to `interpretGlucose`, the safety gate, crisis routing, grounding, or the pantry/voice paths.
- No true gram-level portion math — a "servings" multiplier over the label serving is the honest MVP; frame it as "assuming N servings," never precise grams.

## Guardrails (every phase)

- Grounding-safe, observational copy. #7 tag states a fact from the patient's own log. #6 says "assuming N servings — tap to change," never "you ate exactly …".
- Reuse the `MIN`/floor discipline: #7 shows a tag only when a dose was actually logged that day (`unknown` → no tag). #6 defaults to 1 serving when no portion cue is found.
- Every new domain lib: vitest suite (happy + boundary + empty/none). Every new/changed component: RTL test (`import React`). Keep the i18n parity test green.
- `git add <explicit paths>` only. One commit per phase. NO push.

## Cross-cutting contracts (P0/P2 establish; render against them)

```ts
// src/domain/glucose-med-context.ts   (#7)
import type { DoseEvent, GlucoseReading, Medication } from "./types";

export type ReadingMedStatus = "taken" | "missed" | "unknown";

export type ReadingMedContext = {
  reading: GlucoseReading;
  status: ReadingMedStatus; // per the reading's calendar day (measuredAt UTC date)
  medNames: string[];       // distinct diabetes-med names with a dose logged that day
};

// For each reading: find the calendar day (measuredAt.slice(0,10)); look at dose
// events on that day for medications classified diabetes-"included"
// (classifyDiabetesMedication). No dose logged that day -> "unknown"; any skipped
// -> "missed"; otherwise "taken". Factual only.
export function annotateGlucoseWithMedContext(
  readings: GlucoseReading[],
  doseEvents: DoseEvent[],
  medications: Medication[]
): ReadingMedContext[];
```

```ts
// src/domain/portion.ts   (#6)
import type { Language } from "@/i18n/strings";
import type { NutritionFacts } from "./types";

// Parse a servings count from a phrase, or null when there is no portion cue.
// Accepts en + es number words (one..ten / uno..diez), "a/an/un/una" -> 1,
// "half/media/medio" -> 0.5, and a unit (slice(s)/rebanada, cup/taza,
// piece/pieza, serving/porcion, bowl/plato, can/lata, bottle/botella,
// handful/puñado, scoop) OR an explicit "N servings/porciones". Cap at 20.
export function parsePortionServings(text: string, language: Language): number | null;

// Multiply every non-null numeric field by servings (round to a sensible
// precision); prefix servingSize like `${servings} × ${original}`. Pure.
export function scaleNutrition(nutrition: NutritionFacts, servings: number): NutritionFacts;
```

---

## P0 — #7 core: med-context annotation lib

**Build:**
- `src/domain/glucose-med-context.ts` + `glucose-med-context.test.ts` per contract. Day key = `measuredAt.slice(0, 10)` (UTC date; note this in a one-line comment — fixtures are dated so UTC day matches the intended day). Use `classifyDiabetesMedication` from `pdc-adherence.ts` to pick diabetes meds.
- Tests: reading on a taken-metformin day → `"taken"` with `medNames: ["Metformin"]`; on the skipped day (06-29) → `"missed"`; on a day with no diabetes-med dose (07-02) → `"unknown"`, `medNames: []`; a non-diabetes-only day (only lisinopril logged) → `"unknown"`; empty inputs → all `"unknown"`. Drive at least one case off `brentState`.

**Commit:** `feat: glucose reading med-context annotation lib (T2 P0)`

## P1 — #7 surface: med tag on the Recent readings list

**Build:**
- Small prop-driven component `src/components/glucose-reading-row.tsx` (+ `.test.tsx`, `import React`): props `{ reading: GlucoseReading; status: ReadingMedStatus; medNames: string[] }`. Renders the existing row (`{valueMgDl} mg/dL`, `new Date(measuredAt).toLocaleString()`) plus, when `status !== "unknown"`, a small neutral tag: `"{medNames.join(" & ")} taken"` (calm/`care` styling) or `"{medNames.join(" & ")} missed"` (a muted `note`/`pulse` tone, **not** alarming). No tag when `"unknown"`. English literal.
- `src/app/glucose/page.tsx`: compute `annotateGlucoseWithMedContext(state.glucoseReadings, state.doseEvents, state.medications)`, index by reading id, and render the recent list through `GlucoseReadingRow` (keep the existing `slice(-5).reverse()`). Add a one-line caption above the list: "Tags show what your dose log says for that day — not medical advice."
- Component test: taken/missed/unknown render the right tag / no tag.

**Commit:** `feat: medication-taken tag on recent glucose readings (T2 P1)`

## P2 — #6 core: portion parser + nutrition scaler

**Build:**
- `src/domain/portion.ts` + `portion.test.ts` per contract. `parsePortionServings`: recognize digits and en/es number words, `a/an/un/una`→1, `half/media/medio`→0.5, and the unit list OR "N servings/porciones"; return `null` with no cue; cap at 20. `scaleNutrition`: multiply non-null numerics by servings (round: integers for mg/kcal, one decimal for grams), prefix `servingSize`.
- Tests: `"two slices"`→2, `"a cup of rice"`→1, `"3 servings"`/`"3 porciones"`→3, `"dos rebanadas"`→2, `"media taza"`→0.5, `"just pizza"`→null, `"500 slices"`→capped 20; `scaleNutrition` doubles a known fact and leaves nulls null; servings=1 is identity except the servingSize prefix (decide and assert: prefix only when servings ≠ 1).

**Commit:** `feat: deterministic portion parser + nutrition scaler (T2 P2)`

## P3 — #6 surface: portion on the food card + auto-parse

**Build (`src/app/food/page.tsx`, `src/components/food-facts-card.tsx`, `src/i18n/strings.ts`):**
- Page state `portionServings` (default 1). When `identifiedFood` becomes non-null, initialize it from `parsePortionServings(latestPatientUtterance, language)` (the most recent `mode:"food"`, `role:"patient"` message) — fall back to 1.
- Derive `scaledFood = identifiedFood.nutrition ? { ...identifiedFood, nutrition: scaleNutrition(identifiedFood.nutrition, portionServings) } : identifiedFood`. Feed `scaledFood` to `computeFoodFlags` and to `buildMealLogEntry` (so the logged meal reflects the portion). Do **not** mutate `identifiedFood`.
- `FoodFactsCard`: add a small servings stepper (0.5 then 1..N, `−`/`+`, min-h-12 targets) bound to `portionServings`, with a line "Assuming {n} serving(s) — tap to change." New `FoodLensStringKey`s (e.g. `portionAssuming`, `portionLabel`) in **both** en + es catalogs; keep the parity test green. Card shows the scaled nutrition + flags.
- Tests: `portion.test` already covers parsing; add a `FoodFactsCard` RTL test that changing servings rescales a displayed value and the "Assuming N servings" line updates. Keep it prop-driven (pass `portionServings` + `onPortionChange`).

**Commit:** `feat: conversational portion guessing scales food nutrition and flags (T2 P3)`

## P4 — Demo data, e2e, README

**Build:**
- `src/domain/fixtures.ts` (demo only, no schema change): so #7 shows **both** states in the recent list, add one metformin **skipped** dose on a recent reading-day — 07-02 (which currently has readings 208 & 145 but no metformin dose). Add `dose-brent-metformin-0702` `{ medicationId: "med-metformin", date: "2026-07-02", status: "skipped", barrier: "cost" }`. Now 07-02 readings tag "missed", 07-01/07-04 tag "taken". (Adherence counts recompute honestly.)
- e2e `e2e/diabetes-loop-tier2.spec.ts`: load the Brent demo, go to `/glucose`, assert a recent reading shows "Metformin taken" and another shows "Metformin missed". For #6, drive the food page deterministically (barcode stub like `e2e/food-lens.spec.ts`, or a typed path) to a food with nutrition, change the servings stepper, and assert a nutrition value rescales. Deterministic fixtures, zero env.
- README: one bullet under "What it does" — glucose readings show whether the day's diabetes medicine was taken; meal logging assumes an editable serving count.

**Commit:** `feat: tier-2 demo data, e2e, README (T2 P4)`

**STOP — do not push.** Report phases landed, `npm run check` / `test:e2e` output, and the demo steps.

---

## Acceptance demo (must be clickable at the end)

1. `/privacy` → **Load Brent demo**.
2. `/glucose` → Recent readings: rows tagged "Metformin taken" (e.g. 07-04) and "Metformin missed" (07-02), with the "not medical advice" caption; no tag on days with no dose logged.
3. `/food` → identify a food (barcode/vision), say/type "two servings" (or use the stepper) → nutrition and flags rescale, "Assuming 2 servings — tap to change" shows, and logging stores the scaled meal.
4. Repeat step 3 in Spanish ("dos porciones") to confirm the parser and copy work in es.

## If something conflicts

Keep the base app's behavior and adapt this sprint; note the deviation in the commit body. Never turn the #7 tag into a causal claim, never persist a new field for #6 (scale a derived copy), never let a portion of 0 or a parse failure crash the food flow (default to 1), and keep the crisis/safety/grounding paths untouched.
