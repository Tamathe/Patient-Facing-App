# Diabetes Provider-Legible Loop — Make the Home Data Doctor-Ready

**Paste-ready end-to-end handoff. Execute P0→P3 in order, no per-phase stops. All build work lands in `C:\Patient centered` (Next.js 15 / React 19 / TS strict / Tailwind 3 / useReducer+localStorage / vitest 2 / Playwright, Windows, npm). Solo repo, direct path-scoped commits to `master`, NO push, no PRs.**

## Mission

The Nuna meeting (2026-06-17) showed a provider-summary loop — "this patient is taking meds 80% of the time, their sugars look like X, consider whether they're on the right regimen" — surfaced in a clinician dashboard fed by CGM, cellular cuffs, and an Epic/HIE backend. We deliver **the clinical payload of that idea with none of the backend**: a **patient-owned Health Brief** the patient carries to their visit, made credible by two deterministic analytics computed from data we already store — **glucose time-in-range** and an **auto-surfaced food↔glucose pattern** (Nuna's signature "your breakfast spikes your sugar" moment).

This is a **derivation-only** sprint. Every deliverable is a pure function over existing `AppState`, rendered on existing surfaces. **No `AppState` shape change, no new `AuditEvent.action`, no storage-guard edits, no new npm dependency, no external AI, no diagnosis.** That is what makes it a one-sitting sprint rather than a schema migration.

## Context — the base app today (verified 2026-07-07)

- **Health Brief** — `buildHealthBrief(state, options)` in [src/domain/health-brief.ts](../../src/domain/health-brief.ts) returns `HealthBrief = { id, patientId, generatedAt, sections: Array<{ title, items: string[], status: EvidenceStatus }> }` ([types.ts:148](../../src/domain/types.ts)). It is **blood-pressure-only today**: "Recent home readings" reads `state.readings` (BP), and "When to call my care team" reads only `callThresholdSystolic/Diastolic`. It ignores `glucoseReadings`, `doseEvents`, `medications` adherence, `mealLog`, and the screening loop.
- **Brief surface + export** — rendered at [src/app/visits/page.tsx](../../src/app/visits/page.tsx) via `HealthBriefCard` ([src/components/health-brief-card.tsx](../../src/components/health-brief-card.tsx)), which **already ships Print (`window.print()`) and Share/Download** (`navigator.share` with a text/plain blob fallback). The "hand it to your doctor" affordance exists; only its *content* is thin.
- **Glucose** — `interpretGlucose(reading, recent, carePlan)` in [src/domain/blood-glucose.ts](../../src/domain/blood-glucose.ts) already returns a care-plan-first `GlucoseInsight` (`track|recheck|call_clinic`), and the `/glucose` page ([src/app/glucose/page.tsx](../../src/app/glucose/page.tsx)) already renders that insight banner plus `summarizeGlucoseTrend` ([adherence.ts](../../src/domain/adherence.ts)). `GlucoseReading = { id, patientId, valueMgDl, measuredAt, contexts: MeasurementContext[], note }` ([types.ts:85](../../src/domain/types.ts)).
- **Adherence** — `getAdherenceRate(doseEvents, medicationId, days, today) → { taken, of }` and `getAdherenceStreak(...)` in [adherence.ts](../../src/domain/adherence.ts). `summarizeGlucoseTrend` / `summarizeBpTrend` there establish the **split-half, `MIN_TREND_READINGS = 5`, "general education, not a diagnosis"** idiom this sprint mirrors.
- **Meals** — `MealLogEntry = { id, patientId, loggedAt, food: IdentifiedFood, flags: string[], assistantSummary }` ([types.ts:206](../../src/domain/types.ts)); `food.nutrition` is `NutritionFacts | null` with `carbsG` (null for `vision_estimate`). The diabetes carb cut is defined once in `diabetesLens` ([condition-lens.ts:121](../../src/domain/condition-lens.ts)): `carbsG` rule `dailyLimit 200`, `cautionAtPercent 20` → **40 g is the "higher-carb" line** the food lens already uses.
- **Screening loop** — `screeningResults`, `referrals`, `recallReminders` on `AppState` ([types.ts:299](../../src/domain/types.ts)); locked grade copy in `screeningStrings`. A diabetic's brief can quote the eye result grounding-safe ("Your report says…").
- **Verification** — `npm run check` (lint+test+build, green with zero env vars), `npm run test:e2e` (Playwright), `npm run crisis:gate`.

## What already exists — DO NOT rebuild

1. **Glucose danger CTA on readings** (the audit's "value-add #3"). `interpretGlucose` + care-plan `callThresholdGlucoseLow/High` + `findRecentGlucoseReading` ([recent-clinical-reading.ts](../../src/domain/recent-clinical-reading.ts)) + `hasDangerousGlucose` ([safety.ts](../../src/domain/safety.ts)) already grade every reading and escalate; the `/glucose` page renders the banner. Shipped in commits `38b67a6`, `33ac549`. **This sprint does not touch the glucose safety path.**
2. **Brief Print / Share / Download** — built into `HealthBriefCard`. We add *content*, not export plumbing.
3. **Glucose trend + BP trend** — `summarizeGlucoseTrend` / `summarizeBpTrend`. Reused, not rewritten.

## Scope decisions (locked)

1. **Derivation-only.** Nothing in this sprint changes `AppState`, `types.ts` records, `storage.ts` guards, or the `AuditEvent.action` union. If a phase seems to need a state field, stop and reconsider — the data is already stored.
2. **New analytics live in new files**, keeping the safety-adjacent `blood-glucose.ts` and the contested `adherence.ts` untouched: `src/domain/glucose-range.ts` (time-in-range) and `src/domain/glucose-correlation.ts` (food↔glucose). The brief and pages import from them.
3. **Correlation is deterministic and observational** — a computed mean-delta with a minimum-sample gate, phrased "an observation from your own logs, not a diagnosis." **No LLM, no causal claim.** Under the sample floor it returns `null` and renders nothing.
4. **Honest scope on units and language.** Readings are mg/dL (the `GlucoseLogForm` field is `valueMgDl`); mmol/L entry is out of scope. New brief/glucose-page lines follow those surfaces' **existing English-literal convention** (the brief and glucose page are not `t()`-wired today); a full es pass on the brief is tracked as debt, not done here. Any string added to an already-i18n'd surface (e.g. the food page) ships en + es per house rule.
5. **No new npm dependency, no charting library.** Time-in-range renders as text bands, exactly as trends do.

## Non-goals (do not build)

- No CGM / cellular-cuff / wearable / pill-bottle / SureScripts ingest, no device drivers, no webhooks, no backend.
- No provider-facing dashboard, no Epic/MyChart embed, no HIE/FHIR read or write-back. The brief is patient-carried; nothing leaves the device except what the patient chooses to Share.
- No gamification (points, levels, flames, streak freeze/repair). The clinical streak counter stays a neutral metric.
- No change to `interpretGlucose`, the safety gate, crisis routing, or the grounding verifier's thresholds.
- No `AppState`/`AuditEvent`/`storage.ts`/`types.ts` record changes (see scope 1).

## Guardrails (every phase)

- Path-scoped `git add <paths>` only, never `git add .`/`-A`. One commit per phase, message format given. NO push, no PR.
- Every new domain lib gets a vitest suite (boundary + insufficient-data + happy path); every changed component/page keeps its RTL test green. TS strict, no `any`, `const` over `let`, no comments on unchanged code.
- **Grounding-safe, observational phrasing** on every new patient-facing line, matching the existing "This is general education, not a diagnosis" idiom. Time-in-range states counts, never verdicts. Correlation states a delta "to mention to your care team," never advice.
- After every phase: `npm run check` green with zero env vars. The glucose domain is safety-adjacent — **run `npm run crisis:gate` after P2 and confirm green** even though no crisis/safety file is edited.
- Reuse the split-half / `MIN`-gate idiom; never render an insight from a single data point.

## Cross-cutting contract (P0 establishes; P1–P2 render against it)

Two new pure modules. **No changes to `types.ts`.**

```ts
// src/domain/glucose-range.ts
import type { GlucoseReading } from "./types";

export type TimeInRange = {
  inRange: number;        // count within [low, high] inclusive
  below: number;          // count < low
  above: number;          // count > high
  total: number;          // readings inside the window
  percentInRange: number; // Math.round(inRange / total * 100)
  windowDays: number;
  low: number;            // default 70
  high: number;           // default 180
};

// Returns null below a minimum sample count so a lone reading never renders
// "100% in range". Mirrors MIN_TREND_READINGS discipline.
export function computeTimeInRange(
  readings: GlucoseReading[],
  options?: { low?: number; high?: number; windowDays?: number; now?: Date }
): TimeInRange | null;
```

```ts
// src/domain/glucose-correlation.ts
import type { GlucoseReading, MealLogEntry } from "./types";
import type { ConditionLens } from "./condition-lens";

export type GlucoseFoodInsight = {
  higherCarbMeanMgDl: number;
  otherMeanMgDl: number;
  deltaMgDl: number;        // higherCarb - other, rounded
  higherCarbSamples: number;
  otherSamples: number;
  message: string;          // grounding-safe, observational, English literal
};

// Pairs each meal that has non-null carbsG with the nearest glucose reading in
// (0, postMealWindowHours] after loggedAt. Buckets by the lens carb line
// (diabetesLens carbsG: dailyLimit * cautionAtPercent/100 = 40 g). Emits only
// when BOTH buckets clear minSamplesPerBucket AND |delta| >= deltaFloorMgDl.
// Meals without nutrition are skipped (honest, not guessed). Otherwise null.
export function summarizeFoodGlucoseLink(
  meals: MealLogEntry[],
  glucoseReadings: GlucoseReading[],
  lens: ConditionLens,
  options?: {
    postMealWindowHours?: number;  // default 3
    minSamplesPerBucket?: number;  // default 3
    deltaFloorMgDl?: number;       // default 15
    now?: Date;
  }
): GlucoseFoodInsight | null;
```

**Locked phrasing (English literal; es tracked as debt):**
- Time-in-range band: `"{inRange} of your last {total} blood-sugar readings were in the 70–180 range ({percentInRange}%). This is general education, not a diagnosis."`
- Correlation insight: `"We noticed your blood-sugar readings after higher-carb meals averaged about {deltaMgDl} mg/dL higher than after your other logged meals. This is an observation from your own logs, not a diagnosis — a good thing to mention to your care team."`

---

## P0 — Analytics spine (two pure libs + tests)

**Build:**
- Commit this plan file (`docs/plans/10-diabetes-provider-legible-loop.md`). (The `docs/plans/README.md` table indexes the seven upstream-care specs; plans 09–10 are fold-in sprints and are intentionally not added there — follow the plan-09 precedent.)
- `src/domain/glucose-range.ts` + `glucose-range.test.ts`: `computeTimeInRange` per contract. Window filter by `measuredAt >= now - windowDays*24h`; count against inclusive `[low, high]`; `percentInRange` rounded; **return `null` below `MIN` (reuse 5) readings in-window**. Tests: exact boundary at 70 and 180 (inclusive in-range), empty/one-reading → null, mixed window, custom window/low/high, `now` injection.
- `src/domain/glucose-correlation.ts` + `glucose-correlation.test.ts`: `summarizeFoodGlucoseLink` per contract. Carb line derived from the passed lens's `carbsG` rule (`dailyLimit * cautionAtPercent / 100`); default 40 g if the rule is absent. Pair meal→nearest reading in `(0, postMealWindowHours]`; bucket; require `minSamplesPerBucket` in **each** bucket and `|delta| >= deltaFloorMgDl`; else `null`. Tests: below-floor delta → null, one bucket empty → null, meals with null nutrition skipped, window edge (reading exactly at +3h counts; +3h+1min does not), happy path emits rounded delta + samples, `now` injection.
- No state, no page, no i18n changes in P0.

**Commit:** `feat: glucose time-in-range + food-glucose correlation libs (DPL P0)`

## P1 — Make the Health Brief diabetes-complete

**Build (all in `src/domain/health-brief.ts` + its test; the /visits page and card already render + export):**
- Add a **"Recent blood sugar"** section when `state.glucoseReadings` is non-empty: latest value + `computeTimeInRange(...)` band (locked phrasing) + `summarizeGlucoseTrend(...)` line when it returns non-null. `status: "patient_reported"`.
- Extend **"When to call my care team"**: when `carePlan.callThresholdGlucoseLow/High` are set, add "Call the team if your blood sugar is at or below {low} or at or above {high} mg/dL." alongside the existing BP threshold line; keep the existing `thresholdSource` → `confirmed|inferred` status logic.
- Add a **"Taking my medicines"** section from `doseEvents`: per medication, `getAdherenceRate(doseEvents, med.id, 30, today)` → "{name}: took {taken} of {of} days (last 30)" + `getAdherenceStreak` when > 0. `status: "patient_reported"`. (Neutral counts — no gamification.)
- Add a **"Food & blood-sugar pattern"** line when `summarizeFoodGlucoseLink(state.mealLog, state.glucoseReadings, selectLenses(activeConditions(state.carePlan)))` returns non-null (locked phrasing); omit the section entirely when null. `status: "inferred"`.
- Add an **"Eye screening"** section when a confirmed `screeningResult` and/or `recallReminder` exists: grounding-safe grade quote ("Your report from {date} says…") + next recall month, or "referral to {destination} is in progress." `status: "imported"`.
- Keep every existing BP section untouched and in place; new sections append after the related existing ones (the card renders `sections` in array order). Pass `today`/`now` through `HealthBriefBuildOptions` for deterministic tests.
- Update `health-brief.test.ts`: diabetes-demo state renders the new sections; a BP-only patient renders **exactly** the old sections (no empty diabetes noise); ordering assertion.
- Verify only: [src/app/visits/page.tsx](../../src/app/visits/page.tsx) still builds the brief and Print/Share/Download reach the new sections. **No page or audit change** — it already builds `buildHealthBrief(state, { generatedAt })` and audits Print/Share/Download via `recordAuditEvent(patientId, "shared", …)`; the richer brief flows through unchanged.

**Commit:** `feat: diabetes-complete health brief (glucose, adherence, food pattern, eye screening) (DPL P1)`

## P2 — Surface time-in-range + the pattern on the glucose page

**Build (`src/app/glucose/page.tsx`, matching its existing English-literal card idiom):**
- Under the existing latest-insight/trend cards, render a **time-in-range band** from `computeTimeInRange(state.glucoseReadings)` when non-null: `percentInRange` headline + the count sentence, in a `rounded-control` card consistent with the trend card. No chart.
- Render the **food↔glucose pattern** card from `summarizeFoodGlucoseLink(...)` when non-null (locked phrasing), with a quiet CTA linking to `/food` ("Check a meal"). Omit entirely when null.
- Keep the log form, latest insight, trend, and recent-readings list exactly as they are.
- Component test: with a paired demo dataset both cards render; with sparse data neither renders (no `null` leakage).
- Run `npm run crisis:gate` (glucose surface changed) — must stay green.

**Commit:** `feat: glucose page shows time-in-range and the food-glucose pattern (DPL P2)`

## P3 — Demo data, golden path, e2e, README

**Build:**
- Ensure the demo fixture makes both analytics demoable: [src/domain/fixtures.ts](../../src/domain/fixtures.ts) Brent demo (diabetes + BP) carries **enough paired data** — ≥5 glucose readings across ~14 days for time-in-range, and several meals with `carbsG` (some ≥40 g, some below) each followed by a glucose reading within 3h, so `summarizeFoodGlucoseLink` clears its floor. Seed only demo data — **no schema change.**
- Golden path (clickable): load **Brent demo** from `/privacy` data controls → `/glucose` shows time-in-range + "higher-carb meals averaged ~N mg/dL higher" → `/visits` shows the diabetes-complete brief (blood sugar, time-in-range, adherence, food pattern, eye screening, glucose call threshold) → **Print / Share** produces a brief containing those sections.
- Playwright e2e (`e2e/`): one spec covering demo-load → `/visits` brief contains the new section headings → `/glucose` renders both cards. Deterministic fixtures, zero env.
- README: add the diabetes-brief + time-in-range + food-pattern bullets under "What it does"; note the brief is patient-carried (no provider backend).

**Commit:** `feat: diabetes-legible demo data, golden path, e2e, README (DPL P3)`

**STOP — do not push.** Report: phases landed, `npm run check` / `test:e2e` / `crisis:gate` output, and the golden-path steps.

---

## Acceptance demo (must be clickable at the end)

1. `/privacy` → load **Brent demo (blood pressure + diabetes)**.
2. `/glucose`: time-in-range band ("{n} of your last {m} readings were in the 70–180 range ({p}%)") + the food↔glucose pattern card with a "Check a meal" link to `/food`.
3. `/visits`: the Health Brief now carries **Recent blood sugar** (value + time-in-range + trend), **Taking my medicines** (took X of 30 days), **Food & blood-sugar pattern**, **Eye screening** (grounded grade + recall), and a **glucose call-threshold** line in "When to call my care team" — alongside the unchanged BP sections.
4. **Print** and **Share/Download** the brief → output text includes the new sections.
5. A BP-only patient (no diabetes condition) shows the original brief with no empty diabetes sections.

## If something conflicts

The base app's grounding phrasing, care-plan-first glucose interpretation, and crisis precedence are load-bearing and out of scope to change. If a phase instruction collides with how they work, keep the base behavior and adjust this sprint's derivation. Never let an insight render below its sample floor, never phrase a correlation as advice or causation, and never introduce an `AppState`/`types.ts` change to make a section easier — if you reach for one, the data is already there.
