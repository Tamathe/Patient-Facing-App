# 08 — Diabetes First-Class (Blood-Sugar Ownership)

**Status:** Spec ready for execution
**Author:** Generated via multi-agent codebase research + adversarial review (2026-07-06)
**Scope:** F1–F5 below, in six independently shippable phases P0–P5

---

## 1. Summary

Today the app is a single-condition **hypertension** prototype. "My Numbers" logs only systolic/diastolic/pulse, the app hard-loads a hypertension demo patient (Jordan) with no onboarding, the `diabetesLens` (`src/domain/condition-lens.ts`) is an **empty stub that is never selected**, Home only shows `medications[0]` (Lisinopril), and the Coach answers free-text blood-sugar questions with a fixed mock deflection.

A 65-year-old with type-2 diabetes who wants to "keep my blood sugar under control" therefore falls through at every step. This spec makes that patient first-class:

- **F1** — Blood-sugar (glucose) logging: type → schema → form → screen → insight → trend → reducer → storage, mirroring the proven blood-pressure path.
- **F2** — A first-run **condition picker** (blood pressure / blood sugar / both), written durably and backward-compatibly.
- **F3** — A real **diabetes food lens** (carb / added-sugar / fiber rules + a metformin rule) that food coaching actually selects.
- **F4** — Home surfaces the **medicine that matters** (the med with an active barrier — metformin for Brent), plus a glucose insight/trend.
- **F5** — A **live, grounded Coach** (behind an env flag) that answers "how do I keep my blood sugar under control," preserving the deterministic safety gate + grounding + crisis routing.

Six phases, each ending green on `npm run check` (lint + test + build) **and** `npm run crisis:gate`. Nothing in this spec weakens the deterministic safety-first router or the crisis-gate invariant.

> This document already incorporates the fixes from an adversarial review pass — see **§11** for the traceability table (2 safety blockers, 3 majors, and refinements, all resolved inline).

---

## 2. Problem & Goals

### Persona
**Brent Wright, 65**, has **both hypertension and type-2 diabetes**: metformin 500 mg twice daily with an active **cost** barrier, A1c 8.0%, and sugary-drink coaching flags already in his meal history. The fixture `brentState` (`src/domain/fixtures.ts`) reads as a diabetes patient in prose, but `carePlan.condition` is hard-set to `"hypertension"`, so every condition-gated behavior treats him as hypertension-only.

### Goals
- **G1 (F1)** — Log a blood-sugar (mg/dL) reading; see an interpretation + trend, mirroring the BP path end to end.
- **G2 (F2)** — A first-run step lets the patient say what they are working on; written durably and backward-compatibly.
- **G3 (F3)** — `diabetesLens` carries real carb / added-sugar / fiber + metformin rules, and food coaching selects it for a diabetes (or dual-condition) patient.
- **G4 (F4)** — Home surfaces the med with an active barrier (metformin for Brent), plus a glucose insight/trend.
- **G5 (F5)** — A live Coach answers a free-text blood-sugar question with a real, grounded answer, behind an env flag, preserving crisis short-circuit + grounding.

### Non-goals (explicit)
- **No CGM / device integration.** Glucose is manual entry only (a single mg/dL fingerstick value + context).
- **No backend / no database.** State stays in `localStorage` under `STORAGE_KEY = "home-health-ai-ownership-state"`.
- **No clinical dosing advice.** The app never tells a patient to start/stop/change a dose; `classifySafety` medication-change blocking and `verifyGrounding` medication-change blocking stay intact.
- **No numeric glucose/A1c claims without a cited, matched fact.** Enforced by a new glucose numeric verifier in grounding **and** a prompt guard (§4.4).
- **No new crisis-red-flag corpus rules.** Glucose escalation is added to `classifySafety`'s escalate path, not the guarded corpus (§7).
- **No Spanish free-text nav.** The English-only front-door lexicon stays English-only; Spanish free-text always reaches the Coach by design. i18n string parity is still required for build-green.
- **No obesity lens work** beyond what lens composition requires (obesity stays an empty stub).

---

## 3. Guiding Constraints

1. **Reuse existing patterns, don't invent.** Every new artifact mirrors a named existing one: `GlucoseReading`←`HomeReading`; `glucoseReadingInputSchema`←`bpReadingInputSchema`; `interpretGlucose`←`interpretBloodPressure`; `summarizeGlucoseTrend`←`summarizeBpTrend`; `findRecentGlucoseReading`←`findRecentClinicalReading`; `OpenAiCoachProvider`←`OpenAiVisionProvider`; `/api/coach/text`←`/api/food/vision`.
2. **Additive, backward-compatible storage migrations.** New top-level arrays get an `undefined → []` backfill in `loadStoredState` **before** validation, and land in the **sanitize tier** (`isValidAppState`, invalid entries dropped) — never the **core-reset tier** (`isValidCoreAppState`, where one bad entry wipes to `demoState`). New optional fields on existing types tolerate `undefined` in their guard (the `county` / `accessibilityPreferences?` precedent).
3. **The deterministic safety gate fronts every path.** `classifyCrisis` / `classifySafety` / `screenSocialEmergency` run first in `decideFrontDoor` (router), `decideSafety` (Coach gate), and `evaluateVoiceTranscript` (voice). New glucose routing rules sit **strictly after** the safety short-circuit. Every provider answer flows through `createSafeAiResponse`.
4. **Strict TypeScript.** No `any`. New unions extend existing ones; guards are exhaustive.
5. **English-first, Spanish gated.** Every new i18n key is added to **both** `en` and `es` (parity test `strings.test.ts` fails the build otherwise), even if `es` is a placeholder.
6. **Every phase ends green** on `npm run check` **and** `npm run crisis:gate`. Today `crisis:gate` runs `crisis-red-flags.test.ts` + `safety-gate.test.ts` + `front-door.test.ts` and enforces a **≥0.95 recall floor** and zero false positives (the maintained corpus currently passes at recall 1.00), plus the router invariant (every crisis positive → `{kind:'coach'}`). **P1 extends the gate command to also run `safety.test.ts`** so glucose escalation lands in the gated ops artifact (`docs/ops/red-team-results/`).

---

## 4. Architecture Decisions

### 4.1 Glucose data model (F1)

New type in `src/domain/types.ts`, mirroring `HomeReading` (types.ts:71–80) but with a single numeric value and **reusing the existing `MeasurementContext` enum** (types.ts:69 — avoids editing `isMeasurementContext` and the zod enum in two places):

```ts
// src/domain/types.ts
export type GlucoseReading = {
  id: string;
  patientId: string;
  valueMgDl: number;
  measuredAt: string;
  contexts: MeasurementContext[]; // reuse existing enum (morning/evening/before_medicine/after_medicine/...)
  note: string;
};
```

`AppState` gains a new top-level array alongside `readings`:

```ts
export type AppState = {
  // ...existing...
  readings: HomeReading[];
  glucoseReadings: GlucoseReading[]; // NEW
  // ...
};
```

`CarePlan` gains **bidirectional** call thresholds, tolerated as `undefined` for backward compatibility (§6):

```ts
export type CarePlan = {
  // ...existing...
  callThresholdSystolic: number | null;
  callThresholdDiastolic: number | null;
  callThresholdGlucoseLow?: number | null;  // NEW severe-hypo line
  callThresholdGlucoseHigh?: number | null; // NEW severe-hyper line
  thresholdSource: ThresholdSource;
  // ...
};
```

**Threshold semantics (reconciled — care-plan wins, education band fills the gap):** A care-plan low/high threshold is the **emergency call line**. When present, `v <= low` or `v >= high` → `call_clinic`. The standard-education band (`<70` low warning / `>180` high warning) applies **only within** the thresholds. Brent is therefore seeded with `callThresholdGlucoseLow: 54`, `callThresholdGlucoseHigh: 300`, so `54 < v < 70` still hits the low-education branch and `55–69`/`181–299` are education, not false emergencies.

**Glucose interpretation** — new `src/domain/blood-glucose.ts`, mirroring `interpretBloodPressure` but **bidirectional**, and mirroring `BloodPressureInsight`'s shape:

```ts
// src/domain/blood-glucose.ts
import type { CarePlan, GlucoseReading } from "./types";

export type GlucoseInsight = {
  level: "track" | "recheck" | "call_clinic";
  message: string;
  escalation: "none" | "clinic";
  source: "care_plan" | "standard_education";
};

export function interpretGlucose(
  reading: GlucoseReading,
  recentReadings: GlucoseReading[],
  carePlan: CarePlan
): GlucoseInsight {
  const v = reading.valueMgDl;
  const low = carePlan.callThresholdGlucoseLow ?? null;
  const high = carePlan.callThresholdGlucoseHigh ?? null;

  // Care-plan thresholds take precedence (emergency call line).
  if ((low !== null && v <= low) || (high !== null && v >= high)) {
    return {
      level: "call_clinic",
      message: "This reading meets the call threshold in your plan. Contact your care team and share this reading.",
      escalation: "clinic",
      source: "care_plan"
    };
  }
  if (v < 70) {
    return {
      level: "recheck",
      message: "This is general home blood-sugar education: a reading under 70 mg/dL is a common low-sugar warning. If you feel shaky, sweaty, or confused, treat a low now and recheck in 15 minutes.",
      escalation: "none",
      source: "standard_education"
    };
  }
  if (v > 180) {
    return {
      level: "recheck",
      message: "This is general home blood-sugar education: a reading above 180 mg/dL is above a common after-meal target. Drink water, keep logging, and bring the pattern to your care team.",
      escalation: "none",
      source: "standard_education"
    };
  }
  const hasRecentOutOfRange = recentReadings.slice(-3).some((r) => r.valueMgDl < 70 || r.valueMgDl > 180);
  return {
    level: "track",
    message: hasRecentOutOfRange
      ? "This reading is back in a common range after a recent out-of-range value. Keep logging so your care team can see the pattern."
      : "This reading is within a common range. Log another at your next planned time so your care team can review the trend.",
    escalation: "none",
    source: "standard_education"
  };
}
```

**Glucose trend** — new export in `src/domain/adherence.ts`, mirroring `summarizeBpTrend` (adherence.ts:70–102): `MIN_TREND_READINGS = 5`, sort by `measuredAt`, split earlier/recent halves, average `valueMgDl`, round the delta, band it. `rising` glucose is bad (same polarity as BP). Band `±10` mg/dL (open question §10 Q3), keep the `"This is general education, not a diagnosis."` disclaimer.

```ts
// src/domain/adherence.ts
export type GlucoseTrend = { direction: "improving" | "steady" | "rising"; message: string };
export function summarizeGlucoseTrend(glucoseReadings: GlucoseReading[]): GlucoseTrend | null { /* mirror summarizeBpTrend, GLUCOSE_DELTA = 10 */ }
```

### 4.2 Condition model: single → multi (F2/F3) — keep `condition`, add optional `conditions[]`, compose lenses

**Decision:** Keep `carePlan.condition: Condition` as the single **primary** enum (still exact-enum-validated in `storage.ts` `isCarePlan`). Add an **optional** `carePlan.conditions?: Condition[]` as the source of truth for the full active set. Do **not** replace `condition`; do **not** add a `"both"` member. When `conditions` is absent/empty, everything derives from `condition` exactly as today — zero behavior change for existing users.

```ts
// src/domain/types.ts — CarePlan gains ONE optional field
export type CarePlan = {
  // ...
  condition: Condition;        // UNCHANGED: derived "primary" = conditions[0]
  conditions?: Condition[];    // NEW optional source-of-truth for the full active set
  // ...
};
```

**Lens composition** — new functions in `src/domain/condition-lens.ts`. `selectLens(condition)` stays a thin single-condition wrapper. **Identity contract (locked by test):** for one active condition, `selectLenses` returns the **exact same lens object reference** the existing callers/tests rely on (`selectLenses(['diabetes']) === diabetesLens`).

```ts
// src/domain/condition-lens.ts
const CONDITION_ORDER: Condition[] = ["hypertension", "diabetes", "obesity"];

export function activeConditions(plan: Pick<CarePlan, "condition" | "conditions">): Condition[] {
  const raw = plan.conditions && plan.conditions.length > 0 ? plan.conditions : [plan.condition];
  return CONDITION_ORDER.filter((c) => raw.includes(c)); // canonical order + dedupe
}

export function selectLenses(conditions: Condition[]): ConditionLens {
  const lenses = conditions.map(selectLens);
  if (lenses.length <= 1) return lenses[0] ?? hypertensionLens; // exact reference — identity preserved
  return mergeLenses(lenses);
}

// mergeLenses: safety-first union ->
//  - group nutrientRules by nutrient; "limit" beats "encourage" on a shared nutrient
//    (never encourage what another active condition limits)
//  - between two "limit" rules on one nutrient, keep the LOWER dailyLimit + stricter percents
//  - medDietRules: concatenate (additive, keyed by medicationNames)
//  - personaFocus: join per-lens strings in CONDITION_ORDER (deterministic)
//  - betterOptionGuidance: primary's (identical string across lenses today)
```

**The 5 read sites change** (confirmed by grep — these are the only ones):
- Lens callers `food/page.tsx:25`, `use-food-voice-session.ts:168`, `vision-provider.ts:45` → `selectLenses(activeConditions(state.carePlan))`.
- String consumers `grounding-facts.ts:20`, `food-instructions.ts:43` → `activeConditions(plan).join(" + ")` (e.g. `"hypertension + diabetes"`).
- `storage.ts` `isCarePlan` keeps the exact-enum check on the **primary** `condition`; add one optional-array clause for `conditions` (each member exact-enum). No backfill (optional field). The existing `storage.test.ts` "accepts a diabetes care plan condition" case (`condition:'diabetes'`, no `conditions`) must keep passing — the optional clause preserves it.

**Onboarding write** — a reducer action that **patches** (never a `resetDemo`-style swap), keeping `carePlan.patientId === patient.id`:

```ts
// src/state/store.tsx
type HealthAction = /* ...existing... */ | { type: "completeOnboarding"; conditions: Condition[] };

case "completeOnboarding": {
  const ordered = activeConditions({ condition: action.conditions[0], conditions: action.conditions });
  return {
    ...state,
    carePlan: { ...state.carePlan, condition: ordered[0], conditions: ordered },
    auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "updated", "Onboarding completed")]
  };
}
```

**Brent flip:** `brentState.carePlan` → `condition: "hypertension"` + `conditions: ["hypertension", "diabetes"]`. His BP golden path and the "Diabetes medicine coverage" PDC e2e keep passing **and** diabetes food coaching finally selects. `demoState` (Jordan) keeps **no** `conditions` field, proving the absent-field path.

### 4.3 diabetesLens rules (F3)

Fill `diabetesLens.nutrientRules` and `.medDietRules` (condition-lens.ts:125–126), mirroring `hypertensionLens` exactly. `NutrientRule` may only target existing `NutritionFacts` fields (`NumericNutrient` — no glycemic-index / net-carb field exists):

```ts
export const diabetesLens: ConditionLens = {
  condition: "diabetes",
  personaFocus:
    "Focus on carbohydrates and added sugars first, watch portion size, and encourage fiber. " +
    "Prefer whole foods and small consistent swaps. Keep guidance practical and plain.",
  nutrientRules: [
    { nutrient: "carbsG",        dailyLimit: 200, unit: "g", direction: "limit",     cautionAtPercent: 20, warningAtPercent: 40,   encourageAtPercent: null, flagKey: "flagCarbs" },
    { nutrient: "addedSugarsG",  dailyLimit: 25,  unit: "g", direction: "limit",     cautionAtPercent: 30, warningAtPercent: 60,   encourageAtPercent: null, flagKey: "flagAddedSugars" },
    { nutrient: "saturatedFatG", dailyLimit: 13,  unit: "g", direction: "limit",     cautionAtPercent: 25, warningAtPercent: 50,   encourageAtPercent: null, flagKey: "flagSaturatedFat" },
    { nutrient: "fiberG",        dailyLimit: 28,  unit: "g", direction: "encourage", cautionAtPercent: 0,  warningAtPercent: null,  encourageAtPercent: 10,   flagKey: "flagFiberGood" }
  ],
  medDietRules: [
    {
      id: "metformin_gi",
      medicationNames: ["metformin", "glucophage"],
      productPattern: /alcohol|beer|wine|liquor|whisk(e)?y|vodka/i,
      nutrientTrigger: null,
      patternFlagKey: "flagMetforminAlcohol",
      nutrientFlagKey: "flagMetforminAlcohol", // unused when nutrientTrigger is null; keep a valid key
      modelGuidance:
        "The patient takes metformin. Remind them to take it with food to reduce stomach upset, and to limit alcohol. Do not tell them to change their dose.",
      suppressEncourage: undefined
    }
  ],
  betterOptionGuidance: hypertensionLens.betterOptionGuidance
};
```

`selectLens` already routes `"diabetes"` → `diabetesLens`; it never fired only because of **data** (`carePlan.condition` was `"hypertension"`), fixed by the P0/P2 fixture flip. `computeFoodFlags` needs no change (fully lens-driven). `flagAddedSugars` / `flagFiberGood` keys already exist and are reused; new keys `flagCarbs` and `flagMetforminAlcohol` are added to both `en` and `es` (§8).

### 4.4 Live Coach + safety + grounding wiring (F5)

New `OpenAiCoachProvider implements HealthAiProvider` in `src/ai/coach-provider.ts`, mirroring `OpenAiVisionProvider`: `respond()` POSTs to a new `/api/coach/text` route (a copy of `/api/food/vision` minus the image), returns `{ content, safety: "allowed", sources: coachCitations(state) }`, and **falls back to `MockHealthAiProvider`** on `unconfigured | locked | error` — never hard-fails.

```ts
// src/ai/coach-provider.ts
export class OpenAiCoachProvider implements HealthAiProvider {
  private fallback = new MockHealthAiProvider();
  constructor(private opts?: { passcode?: string }) {}
  async respond(request: HealthAiRequest): Promise<HealthAiResponse> {
    // POST /api/coach/text { question, system, context, patientId, passcode }
    // mode:"answer"  -> { content, safety:"allowed", sources: coachCitations(request.state) }
    // unconfigured|locked|error -> return this.fallback.respond(request)
  }
}
```

`chat/page.tsx:14` swaps `const provider = new MockHealthAiProvider()` for an env-gated selection (live when the flag + passcode are present, else Mock), exactly like `use-food-voice-session` picks live vs mock. **`createSafeAiResponse(request, provider)` is unchanged** — the live provider is passed **into** the gate, so crisis short-circuit + grounding are inherited, and the provider is never constructed/called on a crisis or hard-escalate turn.

**Grounding facts (glucose) — required, not optional.** `collectSourceFacts` (`grounding-facts.ts`) emits each `GlucoseReading` as a `reading`-kind fact keyed by the reading id, and `coachCitations = [carePlan.id, latestGlucoseId, latestBpId]` so `provider.sources` doubles as grounding `citationIds`:

```ts
// src/ai/grounding-facts.ts — inside collectSourceFacts
state.glucoseReadings.forEach((r) => facts.push({
  id: r.id, label: "Home glucose", value: `${r.valueMgDl} mg/dL`,
  sourceKind: "reading", sourceName: "Home monitor",
  confidence: "patient_reported", patientConfirmed: true, effectiveDate: r.measuredAt
}));
```

**Glucose numeric verifier (closes the F5 non-goal).** `verifyGrounding` today numerically verifies only **A1c** and **blood pressure** — a cited glucose fact would otherwise let *any* glucose number through. Add an `extractGlucoseClaims`/`citedGlucosePairs` check mirroring `extractBloodPressureClaims`/`citedReadingPairs`: a stated "sugar/glucose is N" must match a cited glucose reading fact or the answer degrades to `groundingFallback`. This touches `crisis:gate` via `safety-gate.test.ts`. **Belt-and-suspenders:** also extend the Coach system-prompt guard (currently "do not state a specific blood-pressure or A1C number", food-instructions.ts:80) to include glucose: *"do not state a specific blood-pressure, A1C, or blood-sugar number; keep readings & trend general."*

**Glucose-aware patient card.** `patientCard()` / `buildFoodVisionSystemPrompt()` in `food-instructions.ts` hardcode "Latest blood pressure: S/D" and a BP call line. Extend the card to include, for a diabetes/dual-condition patient, the latest glucose reading + glucose thresholds, so the live Coach (and the food prompt) actually have glucose context.

### 4.5 Glucose safety thresholds — live utterances AND stored readings (F5, all paths)

**(a) Live utterance.** Extend `classifySafety` (`src/domain/safety.ts`) with an additive bidirectional numeric branch, gated on an explicit glucose cue, OR-ed into the current escalate line alongside `hasDangerousReading`. No change to the crisis-red-flags corpus — all three consumers (`decideFrontDoor`, `evaluateVoiceTranscript`, `decideSafety`) inherit it.

```ts
// src/domain/safety.ts
const GLUCOSE_CUE = /blood sugar|glucose|mg\/?dl|fingerstick|a1c|sugar (?:is|was|reading)/i;
const DKA_CUE = /nausea|vomit|fruity breath|deep breathing|very thirsty|confusion/i;

export function extractGlucose(input: string): number | null { /* first plausible 2-3 digit mg/dL number */ }
export function hasDangerousGlucose(input: string): boolean {
  if (!GLUCOSE_CUE.test(input)) return false;         // gate: prevents a bare "180" being read as systolic
  const v = extractGlucose(input);
  if (v === null) return false;
  return v < 54 || (v >= 250 && DKA_CUE.test(input));
}
// escalate line: urgentSymptomPatterns.some(...) || hasDangerousReading(input) || hasDangerousGlucose(input)
```

**(b) Stored reading — wired into the Coach gate (BLOCKER fix).** `decideSafety` (`safety-gate.ts:89–130`) today scans only stored **BP** (`findRecentClinicalReading` + `getLatestReading` on `state.readings`). A logged severe-low glucose would *not* escalate. Add a parallel scan:

```ts
// src/domain/recent-clinical-reading.ts
export function findRecentGlucoseReading(glucoseReadings: GlucoseReading[], carePlan: CarePlan): RecentGlucoseFinding | null {
  // pick most recent within the recency window; classify by VALUE (not a slash string):
  //   interpretGlucose(reading, prior, carePlan).escalation === "clinic"  -> danger
  //   OR reading.valueMgDl < 54                                           -> severe (hard escalate)
  // return { readingId, severity, message } so the Coach gate can cite readingId.
}
```

> **Construction note (BLOCKER fix):** do **not** feed a bare number into `classifySafety` — `hasDangerousGlucose` gates on `GLUCOSE_CUE` and a bare `"45"` fails the gate, making the scanner inert. Classify by **value** via `interpretGlucose`/direct comparison, or synthesize a cued string (`classifySafety(\`blood sugar ${r.valueMgDl}\`)`). Tests assert a stored `45 mg/dL` reading escalates and a stored `120 mg/dL` reading does not.

`decideSafety` gains a glucose block mirroring its BP block (safety-gate.ts:96–118): a severe-low / DKA / care-plan-threshold stored reading returns `hard_escalate`/`soft_escalate` with `readingId` in `sources`.

**(c) Priority when both a BP and a glucose finding exist.** Define a combined severity order in `recent-clinical-reading.ts`: `severe_low_glucose` ≈ `threshold_bp` (both hard-escalate; if both present, surface both readings' ids in `sources`, message leads with the hard-escalate class, deterministic — no `Math.random`/time dependence in ordering).

**Threshold ladder** (documented for `interpretGlucose` + `classifySafety` + `findRecentGlucoseReading`):
- `< 54` severe low → **escalate** (front door → Coach; insight `call_clinic`; stored-reading gate).
- `54–69` low → clinic-tier education (`recheck`, escalation `none`) — *unless a care-plan low threshold sits in this band*, in which case care-plan wins.
- `70–180` in-range → `track`.
- `181–249` high → `recheck`.
- `>= 250` alone → `recheck` (clinic education); `>= 250` **with a DKA cue** → **escalate**; `>= high threshold` → `call_clinic`.

### 4.6 DoseCard trend prop — shared `TrendSummary` (TypeScript fix)

`DoseCard` currently receives `trend: BpTrend | null` (from `summarizeBpTrend`). P4 needs to pass a `GlucoseTrend` for a diabetes med — a different type, which would break strict mode. Both trend types are `{ direction; message }`, so introduce a shared shape and widen the prop:

```ts
// src/domain/adherence.ts
export type TrendSummary = { direction: string; message: string }; // BpTrend & GlucoseTrend both satisfy it
```

`DoseCard`'s prop becomes `trend: TrendSummary | null` (or the explicit union `BpTrend | GlucoseTrend | null`). Listed as a **typed-signature change** in P4.

### 4.7 First-run detection — a dedicated marker, not `conditions` absence

`conditions` is absent for **every** existing user (Jordan never gets it), so it cannot be the first-run signal. Use a **separate `localStorage` key** `home-health-onboarding-completed` (independent of `AppState`, so it never touches the reset-to-demo validation), read client-side with the `today-greeting.tsx:100–105` `useState(null)` + `useEffect` pattern (no SSR hydration mismatch). `completeOnboarding` sets it. Fresh installs (no key) → `/onboarding`; existing users (key absent but state present) are treated as already-onboarded by default (§10 Q5).

---

## 5. Phased Plan (P0–P5)

**Sequence rationale:** data model first (everything depends on `AppState.glucoseReadings` + the storage migration), then the logging surface + glucose safety (delivers F1 and the thresholds later phases rely on), then condition multi-model + onboarding (unblocks F3 selection), then the diabetes lens (F3), then Home medicine-that-matters + glucose insight (F4, consumes F1 data), then routing + live Coach (F5, the highest-risk `crisis:gate` surface, last). Each phase is independently shippable and never regresses safety.

---

### P0 — Glucose data model + storage migration + fixtures
**Goal:** Add the type/field/thresholds, migrate storage safely, seed fixtures. Ships invisibly; proves no existing user's data resets.

**Modified files:**
- `src/domain/types.ts` — `GlucoseReading`; `AppState.glucoseReadings`; optional `CarePlan.callThresholdGlucoseLow?/High?`.
- `src/state/storage.ts` —
  - `isGlucoseReading` near `isReading` (isObject + string id/patientId/measuredAt/note + `hasNumber valueMgDl` + `isMeasurementContextArray(contexts)`).
  - `sanitizeGlucoseReadings(value, patientId)` mirroring `sanitizeMealLog` (filter foreign `patientId`, drop invalid).
  - Backfill `if (isObject(parsed) && parsed.glucoseReadings === undefined) parsed.glucoseReadings = [];` **before** `isValidCoreAppState` (storage.ts:609–620 block).
  - **Explicitly** add `glucoseReadings: sanitizedGlucoseReadings` to the `sanitizedState` object literal (storage.ts:629–637) — *not only* the diff — else `...parsed` keeps the raw (un-dropped) array. Add its `JSON.stringify(...)` clause to the persist-diff (storage.ts:644–653).
  - Add `glucoseReadings` to `isValidAppState` (**sanitize tier**), and `PersistedAppState.glucoseReadings: unknown`.
  - In `isCarePlan`, add tolerant clauses for both glucose thresholds (`=== undefined || === null || Number.isFinite(...)`).
- `src/domain/fixtures.ts` — add `glucoseReadings: []` to **all three** fixtures; seed `brentState.glucoseReadings` with ≥5 fasting readings (so the trend fires) and `callThresholdGlucoseLow: 54`, `callThresholdGlucoseHigh: 300`. `demoState`/`deletedDemoState` keep `[]` + thresholds `null`/absent.

**Tests (`storage.test.ts`, mirror mealLog/assessment migration cases):** (a) legacy state without `glucoseReadings` backfills to `[]`, no reset; (b) valid reading round-trips; (c) malformed entry **dropped** (sanitize tier), rest intact; (d) **foreign-`patientId` glucose row is dropped from the persisted state** (asserts the explicit override, not just the diff); (e) carePlan without glucose thresholds loads; (f) existing "accepts a diabetes care plan condition" case still passes.

**Acceptance:** existing Jordan/Brent states load unchanged (glucose backfilled), never reset; Brent carries ≥5 glucose readings + thresholds; all fixtures type-complete.
**Green gate:** `npm run check` + `npm run crisis:gate`.

---

### P1 — Glucose logging + Home glucose insight + glucose safety (live & stored)
**Goal:** F1 end to end; wire glucose escalation into `classifySafety` **and** the stored-reading Coach-gate scanner; extend the crisis gate to cover it.

**New files:** `src/domain/blood-glucose.ts` (§4.1); `src/components/glucose-log-form.tsx` (mirror `bp-log-form.tsx`: single mg/dL input + contexts fieldset + note); `src/app/glucose/page.tsx` (mirror `numbers/page.tsx`).

**Modified files:**
- `src/domain/schemas.ts` — `glucoseReadingInputSchema` (`valueMgDl: z.coerce.number().int().min(20).max(600)`, `contexts` min 1, `note` max 280; **no** superRefine).
- `src/domain/safety.ts` — `GLUCOSE_CUE`, `DKA_CUE`, `extractGlucose`, `hasDangerousGlucose`; OR into the `classifySafety` escalate line (§4.5a).
- `src/domain/adherence.ts` — `GlucoseTrend` + `summarizeGlucoseTrend` + shared `TrendSummary` (§4.1, §4.6).
- `src/domain/recent-clinical-reading.ts` — `findRecentGlucoseReading` classifying by **value** (§4.5b) + combined BP/glucose priority (§4.5c).
- `src/ai/safety-gate.ts` — add the glucose stored-reading block to `decideSafety` (mirror the BP block, cite `readingId`).
- `src/state/store.tsx` — `addGlucoseReading` action + reducer case (append + `recordAuditEvent("created", "Blood sugar reading added")`).
- `src/app/today/page.tsx` — glucose insight panel via `summarizeGlucoseTrend` (mirror dose-card BP-trend block); additive.
- `scripts/crisis-gate.mjs` — add `src/domain/safety.test.ts` to the gate command (glucose escalation enters the gated artifact).
- `src/i18n/strings.ts` — any centralized glucose-screen/insight copy (parity en/es).

**Tests:** `blood-glucose.test.ts` (interpret: severe-low threshold, low/high education, in-range, **Brent-threshold precedence** — 54–70 → call_clinic given low=54... i.e. `<=54` call, `55–69` education); `adherence.test.ts` (`summarizeGlucoseTrend`: <5 → null; improving/steady/rising); `store.test.ts` (`addGlucoseReading` appends + audit); `safety.test.ts` (`hasDangerousGlucose`: `"blood sugar is 45"` → escalate; `"glucose 260 and vomiting"` → escalate; `"blood sugar 260"` alone → not escalate; bare `"180"` no cue → not escalate; `"I took all my metformin this morning"` → not crisis — guards the overdose negative); `recent-clinical-reading.test.ts` (stored 45 → flagged, 120 → not; deterministic; BP/glucose priority); `safety-gate.test.ts` (**stored 45 mg/dL reading yields escalation with reading id in sources**).

**Acceptance:** `/glucose` logs → interpretation → trend after ≥5; a severe-low/DKA **utterance** escalates via `classifySafety`; a severe-low **stored reading** escalates via `decideSafety`; Home shows a glucose trend for Brent without removing the BP trend.
**Green gate:** `npm run check` + `npm run crisis:gate` — **high risk** (touches `safety.ts`, `recent-clinical-reading.ts`, `safety-gate.ts`, gate command); run it explicitly and confirm the dated red-team file writes.

---

### P2 — Condition multi-model + onboarding condition picker
**Goal:** F2 + the multi-condition foundation; flip Brent to dual-condition.

**New files:** `src/app/onboarding/page.tsx` — picker (BP / blood sugar / both) → `completeOnboarding` → `router.replace("/today")`; mirror `intake/page.tsx` parse-then-dispatch; first-run detection via the dedicated `home-health-onboarding-completed` key (§4.7); English-gated (Spanish patients skip; default derives from `condition`).

**Modified files:** `types.ts` (`conditions?`); `condition-lens.ts` (`activeConditions`, `selectLenses`, `mergeLenses`; keep `selectLens`); `store.tsx` (`completeOnboarding`, patches only — sets the localStorage marker); `storage.ts` (`isCarePlan` optional `conditions` clause); `app/page.tsx` (first-run-aware redirect using the marker, **not** `conditions` absence); `food/page.tsx`, `use-food-voice-session.ts`, `vision-provider.ts` (→ `selectLenses(activeConditions(...))`); `grounding-facts.ts`, `food-instructions.ts` (→ `activeConditions(plan).join(" + ")`); `fixtures.ts` (Brent → `conditions:["hypertension","diabetes"]`).

**Tests:** `condition-lens.test.ts` (**`selectLenses(['diabetes']) === diabetesLens` by `toBe`** — identity contract; `activeConditions` fallback; two-condition merge unions rules; limit-beats-encourage on a shared nutrient); `storage.test.ts` (carePlan without `conditions` loads unchanged; with `conditions` round-trips); `store.test.ts` (`completeOnboarding` patches `condition`+`conditions`, writes audit, keeps `carePlan.patientId === patient.id`, doesn't clobber other state); e2e (onboarding shows/writes; BP golden path + "Diabetes medicine coverage" pass after the Brent flip).

**Acceptance:** first-run shows the picker; "both" writes `["hypertension","diabetes"]`; existing single-condition states unchanged; Brent dual-condition; BP unaffected.
**Green gate:** `npm run check` + `npm run crisis:gate`.

---

### P3 — diabetesLens rules + condition-aware food + i18n
**Goal:** F3. Food coaching selects diabetes rules for Brent.

**Modified files:** `condition-lens.ts` (fill `diabetesLens` per §4.3; expand `personaFocus`); `i18n/strings.ts` (extend `FoodLensStringKey` with `flagCarbs`, `flagMetforminAlcohol`; add to **en and es** with correct placeholders — `{amount}`/`{percent}`/`{limit}` for nutrient flags, `{med}` for med flags).

**Tests:** `condition-lens.test.ts` — **rewrite** the "keeps stubs valid but empty" case (currently `diabetesLens.nutrientRules.toHaveLength(0)`): assert a leading `carbsG` limit rule, a `fiberG` encourage rule, a `metformin_gi` medDietRule; `food-flags.test.ts` — diabetes block (oats seed `carbsG 27`/`fiberG 4`: carb limit flag fires, fiber encourage fires, metformin rule activates for a Metformin med); `food-instructions.test.ts` — diabetes-lens prompt names carbs/metformin/"diabetes"; `strings.test.ts` parity auto-covers new keys.

**Acceptance:** a diabetes/dual-condition patient's food coaching produces carb/added-sugar/fiber flags + metformin guidance; the dual-condition case unions BP sodium/potassium **with** diabetes carb/fiber; build green (parity satisfied).
**Green gate:** `npm run check` + `npm run crisis:gate`.

---

### P4 — Home "medicine that matters"
**Goal:** F4 med selection. Home features the barrier med (metformin for Brent), not `medications[0]`.

**Modified files:**
- `src/app/today/page.tsx` — replace `medications[0]` with `pickFeaturedMedication(state)`: prefer a med with `activeBarriers.length > 0` (matches the `tasks.ts:66` barrier predicate so Home and the task agree), else the first diabetes-classified med (`classifyDiabetesMedication`, `pdc-adherence.ts:236–263`) for a diabetes plan, else `medications[0]`. Thread the chosen med through `todayDose`/`streak`/`trend`/`recordDose` (`logDose`/`undoDose` are already per-`medicationId`). For a diabetes med, pass a **glucose** `TrendSummary` (or `null`), never the BP trend.
- `src/components/dose-card.tsx` — prop `trend: TrendSummary | null` (§4.6); render the passed trend as-is.
- `src/domain/tasks.ts` — the `task-med-barrier` task names the **specific** medicine (so Home and task agree).
- `src/domain/health-brief.ts` — add a glucose line to "Recent home readings" (lockstep with F1).

**Tests:** new today/dose-card selection test (Brent's featured med is metformin, the `cost`-barrier med, not Lisinopril; Jordan still Lisinopril); `tasks.test.ts` (barrier task names the specific med; `MAX_TODAY_TASKS`/priority invariants preserved).
**Acceptance:** Brent's dose card shows metformin, and the barrier task + visible med point at the same medicine; Jordan unchanged; twice-daily semantics honest (one-tap-per-day, no AM/PM claim — §10 Q4).
**Green gate:** `npm run check` + `npm run crisis:gate`.

---

### P5 — Front-door glucose routing + live Coach (flagged) + grounding
**Goal:** F5. Route glucose phrasing to `/glucose`; add the live Coach; keep every safety invariant green.

**New files:** `src/app/api/coach/text/route.ts` (copy `/api/food/vision` minus the image; env-gated by `HEALTH_AI_PROVIDER==="openai"` + `HEALTH_AI_API_KEY` + `DEMO_PASSCODE`; response union `answer|unconfigured|locked|error`); `src/ai/coach-provider.ts` (`OpenAiCoachProvider`, §4.4).

**Modified files:**
- `src/domain/front-door.ts` — glucose routing **after** the crisis/safety/social short-circuit: `ROUTE_LABELS["/glucose"]="My Blood Sugar"`; a VERB_RULE `/\b(log|record|add|enter|save|track)\b.*\b(blood sugar|glucose|a1c)\b/ → "/glucose"`; a NAV_LEXICON entry `{ test: /\b(blood sugar|glucose|a1c)\b/, href:"/glucose", label:"My Blood Sugar" }` (own href; require "blood sugar" so "sugar" doesn't collide with `/food`).
- `src/domain/route-classifier.ts` — `ROUTE_SYNONYMS["/glucose"]=["blood sugar","glucose","a1c","glucometer","fingerstick"]`; keep `CLASSIFIER_HREFS` in lockstep with `MENU_GROUPS`.
- `src/components/menu-grid.tsx` — add the `/glucose` menu item (required so `CLASSIFIER_HREFS === MENU_GROUPS` and the `menu-grid.test` `REQUIRED_ROUTES` stay green); update `REQUIRED_ROUTES` same phase.
- `src/ai/grounding-facts.ts` — glucose reading facts + `coachCitations` + the `extractGlucoseClaims` numeric verifier in `grounding.ts` (§4.4).
- `src/ai/food-instructions.ts` / `src/ai/prompts.ts` — glucose-aware patient card + the "no specific blood-sugar number" prompt guard (§4.4).
- `src/app/chat/page.tsx` — env-gated live-or-mock provider; add a **glucose branch to `describeSource`** (BP-only today) so a cited glucose fact renders; `createSafeAiResponse(request, provider)` unchanged.
- `src/ai/voice-gate.ts` — add an explicit test that `hasDangerousGlucose` is inherited (it lives in `classifySafety`, which `evaluateVoiceTranscript` calls); no code change if inheritance holds.

**Tests:** `front-door.test.ts` (crisis:gate) — `"log my blood sugar"` → `/glucose`; `"blood sugar"` short → `/glucose`; crisis / med-change / dangerous-reading still `{kind:"coach"}`; `CLASSIFIER_HREFS === MENU_GROUPS` green; `menu-grid.test.tsx` — `REQUIRED_ROUTES` includes `/glucose`; `safety-gate.test.ts` (crisis:gate) — a mocked live `respond` is still crisis-short-circuited (`provider.respond` **not** called on `"I want to die"`/`"chest pain"`), grounding-checked; a blood-sugar question yields a grounded answer citing glucose/care-plan facts (allowed); an ungrounded/**wrong-number** blood-sugar answer degrades to `groundingFallback` (blocked); the parametrized "grounding leaves every canned answer intact" runs across `demoState` **and** `brentState`; `api/coach/text/route.test.ts` (env gate, passcode lock, unconfigured fallback); e2e (Coach "how do I keep my blood sugar under control" → grounded, non-deflection).

**Acceptance:** "log my blood sugar" → `/glucose`; no crisis/med-change/dangerous-reading utterance ever routes to `/glucose`; with flag on + key configured the Coach answers with a grounded answer; flag off / key absent → Mock fallback; grounding failure → care-team fallback.
**Green gate:** `npm run check` + `npm run crisis:gate` — **highest risk** (front-door + safety-gate + grounding). Run explicitly; confirm the dated red-team file writes.

---

## 6. Data Migration & Backward Compatibility

**The reset-to-demo trap:** `loadStoredState` (storage.ts:597–664) returns `demoState` and wipes `localStorage` on any `isValidCoreAppState`/`isValidAppState` failure. Two rules keep this safe:

1. **New top-level array (`glucoseReadings`)** — backfill `undefined → []` **before** validation (storage.ts:609–620 precedent), validate in the **sanitize tier** only, and **explicitly** put `sanitizeGlucoseReadings(...)` into the `sanitizedState` object literal (not just the persist-diff) so a foreign-`patientId` row is actually dropped — `isValidCoreAppState`/`hasValidRelationships` do **not** iterate `glucoseReadings`, so the drop must happen in sanitize.
2. **New optional fields (`conditions?`, `callThresholdGlucoseLow/High?`)** — no backfill; guards tolerate `undefined` (county / accessibilityPreferences precedent). `condition` stays required + exact-enum.

**Existing stored state:** Jordan loads with `glucoseReadings: []`, no `conditions`, thresholds absent → derives from `condition:"hypertension"` as today. A previously persisted Brent (pre-glucose) backfills `glucoseReadings: []`, `conditions` absent → single condition, no reset; `resetDemo`/"Load Brent demo" gives the new fully-seeded fixture. `deletedDemoState` stays valid (`glucoseReadings: []`). The `home-health-onboarding-completed` marker is a **separate** localStorage key, outside `AppState`, so it never affects validation.

---

## 7. Safety & Crisis Considerations

- **Additive, not corpus-level.** `hasDangerousGlucose` OR-ed into the `classifySafety` escalate line is inherited by router, voice, and Coach gate with zero per-caller change; the guarded crisis-red-flags corpus is untouched, so `crisis:gate` stays green by construction. P1 also adds `safety.test.ts` to the gate command so glucose escalation is in the ops artifact.
- **Stored dangerous readings escalate** — `decideSafety` gains a glucose scan (`findRecentGlucoseReading`), classifying by value (not a slash string), so a logged severe-low escalates even on a benign turn (BLOCKER fix).
- **Cue-gate** prevents a bare number being misread as a systolic; the stored-reading scanner classifies by value to avoid the same inertness (BLOCKER fix).
- **Bidirectional ladder** (§4.5): `<54` and `>=250 + DKA cue` escalate; moderate out-of-range is education, matching BP's `>=140/90`-as-education behavior.
- **Router invariant preserved** — glucose NAV/VERB/synonym rules sit strictly after the crisis/safety/social short-circuit; `front-door.test.ts` keeps the every-crisis-positive → coach assertion.
- **Grounding invariant preserved + strengthened** — the live provider is passed **into** `createSafeAiResponse` (never called before `decideSafety`); a new glucose numeric verifier + prompt guard stop uncited/mismatched glucose numbers (MAJOR fix).
- **Medication-change stays blocked** — "Should I stop my metformin" hits `medicationChangePatterns` → `blocked`; the metformin rule's `modelGuidance` says "Do not tell them to change their dose."
- **No naive overdose rule** — `isIntentionalOverdose` needs whole-supply AND intent, so "I took all my metformin this morning" is honest logging; a corpus negative guards it.

---

## 8. i18n Plan

- Two catalogs in `src/i18n/strings.ts` (`foodLensStrings`, `safetyStrings`), each `Record<Language, Record<Key, string>>`; `strings.test.ts` locale-parity asserts equal key sets per catalog — an en-only key fails the build.
- **New `FoodLensStringKey` (P3):** `flagCarbs` (placeholders `{amount}`/`{percent}`/`{limit}`), `flagMetforminAlcohol` (`{med}`). Reuse `flagAddedSugars`/`flagFiberGood`.
- **Onboarding + glucose copy (P1/P2):** inline (English-gated UI) or centralized to both locales.
- **Gating:** onboarding + Home composer/Coach glucose consequences are English-gated (`patient.language === "en"`); Spanish free-text always routes to the Coach. **es strings may be placeholders** (es translation is a known pending item) but must exist so parity/build passes. Register any **new catalog** in the `strings.test.ts` `catalogs` object.

---

## 9. Testing & Rollout

| Phase | vitest | e2e | crisis:gate risk |
|---|---|---|---|
| P0 | storage migration (backfill / round-trip / drop / **foreign-id drop** / optional-threshold / existing diabetes-condition case) | — | low |
| P1 | blood-glucose, adherence(glucose), store(add), safety(glucose), recent-clinical-reading(glucose+priority), **safety-gate(stored 45)** | — | **high** |
| P2 | condition-lens(compose + **`toBe` identity**), storage(conditions), store(completeOnboarding + patientId invariant) | onboarding + Brent-flip regression | med |
| P3 | condition-lens(rewrite empty-stub), food-flags(diabetes), food-instructions(diabetes), strings parity | — | low |
| P4 | today/dose-card selection, tasks(named barrier) | — | low |
| P5 | front-door(glucose nav + crisis-coach), menu-grid(REQUIRED_ROUTES), safety-gate(live gated + glucose grounding + wrong-number), coach/text route, voice-gate | Coach blood-sugar grounded answer | **high** |

- **Conventions:** colocated `*.test.ts(x)`, vitest + @testing-library; `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"))` for recency; `vi.fn()` spies to assert `provider.respond` is/isn't called; state built by spreading `demoState`/`brentState`. **Playwright e2e** seeds via `localStorage.setItem(STORAGE_KEY, ...)` in `addInitScript` — the serialized fixture must now include `glucoseReadings` (and `conditions` for Brent) or the sanitize pass silently drops/backfills; not part of `npm run check`.
- **Feature flags / env (repo idiom — plain `process.env`, no `NEXT_PUBLIC_` registry; that belongs to the separate `rhtp-prototype`):** live Coach gated on `HEALTH_AI_PROVIDER==="openai"` + `HEALTH_AI_API_KEY` (server-held in `/api/coach/text`) + `DEMO_PASSCODE` cost gate (client reads passcode from `?k=`, like `use-food-voice-session`). Unset → Mock. Onboarding needs no flag (deterministic client gate).
- **Deploy (phased-sprint / ship-phase style):** each phase ends green on `npm run check` + `npm run crisis:gate`; independently shippable. Final checkpoint pushes autonomously (`git push origin master`, never force), deploy-verifies 200s, sets `HEALTH_AI_*` + `DEMO_PASSCODE` on Vercel, flips the live-Coach flag to LIVE. Rotate the OpenAI key after any live demo (project memory).

---

## 10. Open Questions / Decisions for the User

1. **Severe-hypo surface.** `<54` escalates to the Coach. Want a stronger dedicated hypoglycemia safety card (treat-a-low steps) beyond Coach-escalation + `call_clinic`? *(Default: Coach-escalation + `interpretGlucose` `call_clinic`, no new crisis corpus rule.)*
2. **Glucose contexts.** Reuse the existing `MeasurementContext` enum, or add `"fasting"`/`"after_meal"` members (more precise, widens the enum + guard + zod)? *(Default: reuse existing.)*
3. **Glucose trend band.** BP uses `±3`. Proposed `±10` mg/dL for improving/rising. *(Default: `±10`.)*
4. **Twice-daily metformin.** `DoseEvent` dedupes on `(medicationId, date)` — one mark/day. Accept one-tap-per-day (honest, no AM/PM claim), or extend `DoseEvent` with a slot? *(Default: one-tap-per-day.)*
5. **Onboarding for existing users.** Fresh installs only, or offer the picker to users with existing state? *(Default: fresh installs only; existing state derives from `condition`.)*
6. **Live Coach model + local gate.** Confirm the OpenAI chat model for `/api/coach/text`, and whether the `DEMO_PASSCODE` gate applies in local dev *(proposed: skip gate when `DEMO_PASSCODE` unset, like the vision route)*.

---

## 11. Adversarial Review Resolutions (traceability)

| # | Severity | Finding | Resolved in |
|---|---|---|---|
| 1 | Blocker | Stored dangerous glucose never wired into `decideSafety` (Coach gate) | §4.5b, P1 (`safety-gate.ts` glucose block; `safety-gate.test.ts` stored-45 case) |
| 2 | Blocker | Reused numeric scanner inert on a bare mg/dL number (cue-gated) | §4.5b (classify by value, not a bare string); P1 tests |
| 3 | Major | No glucose numeric verifier in grounding + prompt guard omits glucose | §4.4 (`extractGlucoseClaims` + extended prompt guard); P5 |
| 4 | Major | Storage: sanitized glucose array discarded if only added to the diff | §6, P0 (explicit `sanitizedState` override + foreign-id drop test) |
| 5 | Major | `DoseCard` trend prop is `BpTrend`-typed; `GlucoseTrend` breaks strict TS | §4.6 shared `TrendSummary`; P4 typed change |
| 6 | Major | `selectLenses` single-condition identity contract unspecified | §4.2 (`lenses[0]` reference) + P2 `toBe` test |
| 7 | Minor | `crisis:gate` doesn't run `safety.test.ts` | §3.6 / P1 (add `safety.test.ts` to `crisis-gate.mjs`) |
| 8 | Minor | Overstated recall floor (1.00 vs ≥0.95) | §3.6 wording corrected |
| 9 | Minor | `interpretGlucose` threshold vs education-band conflict for Brent | §4.1 (care-plan wins; Brent low=54/high=300) |
| 10 | Minor | First-run gate can't use `conditions` absence | §4.7 dedicated localStorage marker |
| M1 | Missing | `food-instructions.ts` patient card hardcodes BP | §4.4 glucose-aware patient card; P5 |
| M2 | Missing | `describeSource` / health-brief glucose surfacing | P4 (`health-brief`), P5 (`describeSource` branch) |
| M3 | Missing | onboarding audit-relationship invariant untested | §4.2, P2 (`patientId` invariant test) |
| M4 | Missing | existing `storage.test.ts` diabetes-condition case | P0 test (f) enumerated |
| M5 | Missing | BP-vs-glucose scanner priority when both severe | §4.5c deterministic priority |
| M6 | Missing | e2e fixture must include `glucoseReadings`/`conditions` | §9 e2e seeding note |
