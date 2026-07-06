# Implementation Plan — Triaged Between-Visit Remote Monitoring (HF & Post-Discharge)

**Spec:** `docs/specs/02-between-visit-monitoring.md`
**Status of this revision:** Every symbol, line number, guard, and test assertion below was re-verified against live source. Corrections from the draft are marked **[FIX]**. The most consequential change is a hard gating requirement on the safety-gate branch (§4 P0-7) that the draft's "above stored-vitals" ordering silently violated.

## Foundations dependencies

| F-item | B/H | Why this feature needs it — verified deltas |
|---|---|---|
| **F1 Backend** | **Blocking (real-PHI worklist only)** | The worklist (FR-9/FR-10) is a multi-patient PHI surface, un-shippable on localStorage. **P0 sidesteps it** by running the worklist over **fixture data in one browser**. **[FIX] Caveat to state in-product/README:** `/worklist` is a clinician surface living in the same single-user, no-auth app and reading the same `home-health-ai-ownership-state` localStorage key as the patient. Acceptable for a fixture demo *only*; it provides zero patient isolation and must not touch real PHI before F1. |
| **F3 Audit actor** | **Blocking** | FR-10 needs actor+reason on disposition. Shipped `AuditEvent` (`types.ts:127–133`) has a closed `action` union and **no actor**; `recordAuditEvent(patientId, action, label)` (`audit.ts:3–15`) takes three args; `isAuditEvent` (`storage.ts:346–360`) hard-codes the six strings; every reducer case constructs events **inline** with a fixed action (`store.tsx:46,55,63,…`). Consume F3's extended shape. **If F3 not merged, P0-2 ships the fully-scoped fallback in §2 — not a hand-wave.** |
| **F4 Crisis gate (`task_e569880c`)** | **Helpful, NOT blocking for correctness** | **[FIX]** HF red-flags are an urgent-*symptom* class, **not crisis/suicidality**. `task_e569880c` only reorders branches *around* `crisis_escalate`; it does not change where a physical-symptom branch belongs. So the deterministic HF core (P0-5/P0-6) has **zero** dependency on that merge. The *only* coupling is: (a) the HF branch must import the action-constant export rather than a literal array, and (b) if `crisis_escalate` becomes branch #1, the HF hard branch sits below it. Treat as a **coordination point on P0-7's final wiring**, not a gate on the whole milestone. |
| **F5 Reg/provenance + `SourceCitation`** | **Blocking at first "recommending" surface** | The weight rule ("≥3 lb/24h → call your clinic") and worklist suggested-actions are the non-device-CDS line F5 governs. HF thresholds carry a `SourceCitation` + evidence label. P0 demo may ship `standard_education` provenance; licensed sign-off gates real-patient use. |
| **F6 Condition union** | **Blocking** | Add `heart_failure` to `Condition` (`types.ts:19`), the `isCarePlan` guard (**`storage.ts:372`**, within the guard fn at 366–382), and `selectLens()` (**`condition-lens.ts:139–149`**). **[FIX]** The draft cited "condition-lens.ts:121–149" — that range conflates the diabetes/obesity **stub lenses** (121–137) with `selectLens` (139–149). Weight thresholds live in a **new `hf-config.ts`**, never on `ConditionLens` (nutrition-only: `nutrientRules`/`medDietRules`/`betterOptionGuidance`). |
| **F7 Sensor hook** | **Blocking for P1 devices only** | Bluetooth scale follows `use-food-camera.ts` lifecycle + `food-lookup.ts` degradation, tagging each reading `"device" \| "manual"`. **P0 is manual-entry only and does not need F7.** |
| **F9 i18n parity** | **Helpful — but needs its own fallback** | **[FIX]** The parity test (`strings.test.ts:20–26`) is **hard-wired to `foodLensStrings`**, and `condition-lens.ts` depends on `FoodLensStringKey` for its flag keys. F9 generalizes the loop. **If F9 has not landed when P0-10 runs, P0-10 must itself either (a) add a second parity `it()` block over `monitoringStrings`, or (b) do the small generalization.** Do not assume F9 (mirror the F3 fallback discipline). |
| **F10 Dataset registry** | **Blocking for the threshold numbers** | 3 lb/24h · 5 lb/7d must be registry-backed with clinical sign-off before patient exposure. P0 demo ships `standard_education` labels; sign-off gates real use. |
| F2 Demographics | not needed | HF weight math is age/sex-independent. |
| F8 Return channel | Helpful | Time-to-disposition is richer with F8; P0 measures disposition timestamps locally. |

---

## 1. Objective & P0 Definition of Done

**Thin shippable slice:** the **HF daily-weight loop + manual discharge protocol**, running end-to-end on the existing localStorage prototype, plus a **triaged worklist over fixture data**. Zero device, EHR, or backend dependency. Runs fully on `HEALTH_AI_PROVIDER=mock` (no API key, no network).

Done when all of the following hold and `npm run check` (= `next lint && vitest run && next build`, verified in `package.json`) is green:

1. A patient with `carePlan.condition === "heart_failure"` sees a **≤15-second daily ritual** in Today: log one weight + answer one 3-option symptom question; caregiver proxy can log the same.
2. `WeightReading` and `SymptomCheckIn` persist via **new reducer actions** (`addWeightReading`, `addSymptomCheckIn`) that auto-audit and survive reload (pass `loadStoredState` validation, including a v0.1 blob with no weight fields).
3. A **deterministic** `evaluateWeightTrend` (no LLM) computes today-vs-7-day baseline, classifies against HF thresholds, and returns a plain-language narrative. Below threshold → "you're steady," **no alert**. At/over → a `soft_escalate` naming the crossed threshold + suggested action.
4. Weight/symptom inputs flow through `createSafeAiResponse`: structured red-flags (dyspnea *at rest* / syncope / chest pain / new confusion) → **`hard_escalate`** (escalation is the whole answer, provider not called, urgent-care + 911 language); threshold-crossing trend or exertional "more short of breath than usual" → **`soft_escalate`** (banner + care-team actions). **[FIX] Acceptance-critical:** every pre-existing assertion in `safety.test.ts`, `safety-gate.test.ts`, and `safety-dose-change.test.ts` passes **unchanged** — which requires the HF branch to be **inert on non-HF / no-symptom fixtures** (see §4 P0-7).
5. A manual `dischargeEvent` seeds a **48–72h protocol** of countdown `TaskItem`s (med-recon confirm, twice-daily red-flag check, follow-up-booking) with deadlines relative to discharge; med recon reuses `DoseEvent`/`MedicationBarrier`; any "which pills do I stop?" hits the existing `medicationChangePatterns` block (`safety.ts:6–20`) + drafted message.
6. A **care-team worklist page** (`/worklist`) renders a **ranked list over fixture data** — name · reason · suggested action · `EvidenceStatus` badge — one-click disposition (Acknowledge / Message / Book / Snooze-with-reason) writes an **actor-bearing audit record** (via F3 or the §2 fallback).
7. **No alert without a "why"** (FR-5) and **missing-data surfaced, never as reassurance** (FR-16) each covered by named unit tests.
8. All new patient-facing strings exist EN+ES and the parity CI check fails on a missing ES key.

**Explicitly out of P0** (deferred, per spec phasing): Bluetooth devices (F7), Sonnet multi-signal reasons, real backend/multi-patient PHI worklist (F1), ADT/FHIR, voice check-in, Health Brief sections, snooze/mute analytics, RPM billing capture.

---

## 2. Prerequisites & Dependencies

**Blocking before P0 code starts:**
- **F6** — `heart_failure` in `Condition` + `isCarePlan` guard (`storage.ts:372`) + `selectLens` case + a **real** HF nutrition lens (fluid/sodium, not a stub) + fixture. **One atomic commit** — a partial state (union widened but guard not) makes the storage guard reject any HF care plan and silently reset to `demoState` (`storage.ts:518`).

**F3 — consume, or ship this fully-scoped fallback ([FIX] the draft under-specified it):**
- If F3 merged: use extended `AuditEvent` + `recordAuditEvent(patientId, action, label, { actor, reason })`.
- Else, the fallback is a **complete slice**, not just a type: add `WorklistDisposition { id, patientId, actor: { kind: "clinician" | "patient" | "system"; id: string }, action: "acknowledged" | "messaged" | "booked" | "snoozed", reason: string | null, dispositionedAt: string }`; add `worklistDispositions: WorklistDisposition[]` to `AppState`; add `isWorklistDisposition` guard; wire it into `isValidCoreAppState`/`isValidAppState`; add a `loadStoredState` back-fill (`worklistDispositions ?? []`); scope it by `patientId` in `hasValidRelationships`. File `AuditEvent` unification as an F3 follow-up. Prefer consuming F3.

**Blocking before real-patient (not demo) use — hard gates, do NOT cross in P0:**
- **F1** backend (BAA, encryption, authz, server audit) before any real multi-patient PHI in the worklist.
- **F5** counsel sign-off on the non-device-CDS classification of threshold-based suggested actions.
- **F10** licensed, dated HF threshold dataset with a named clinical owner.

**In-flight coordination — `task_e569880c` (F4):** **[FIX]** It makes `crisis_escalate` the first branch and may rename/extend the action constant. It is **not a correctness gate on the HF work** because HF red-flags are not crisis. Concrete coupling for P0-7 only: (1) **`CARE_TEAM_ACTIONS` is a module-local `const` at `safety-gate.ts:7`, NOT exported today** — P0-7 (or `task_e569880c`) must export it (or a shared `CARE_TEAM_ACTIONS`/`CRISIS_ACTIONS`); do not re-declare the literal `["call_clinic","draft_message"]`. (2) Place the HF hard branch below `crisis_escalate` once that lands. If `task_e569880c` slips, P0-7 can still land against today's gate by exporting the constant itself and slotting the HF branch as described in §4 — then a one-line reorder when crisis merges.

**External dependencies:** none for P0 (manual entry). Web Bluetooth scale is P1; ADT/FHIR/pharmacy are P2.

---

## 3. Architecture & Approach

**Data flow (P0):**

```
Patient (Today ritual) ── addWeightReading / addSymptomCheckIn ─(auto-audit)─► AppState (localStorage)
        │
        ▼
evaluateWeightTrend(weightReadings, hfConfig, now)        [DETERMINISTIC, domain/, no LLM]
        │  → { direction, crossedRule|null, narrative, evidence }
        ▼
classifyHfSymptom(symptomCheckIn)                          [DETERMINISTIC, domain/, no LLM]
        │  → { tier: "hard" | "soft" | "none" }
        ▼
decideSafety(request)   [safety-gate.ts, extended — HF branch GATED on HF patient + present signal]
        │  hard → hard_escalate (provider never called) ; soft/threshold → soft_escalate
        ▼
createSafeAiResponse → banner + exported CARE_TEAM_ACTIONS ; auto-draft via buildCareTeamMessage(state, ctx)
        ▼
buildWorklist(panel)   [NEW domain/worklist.ts]  ── ranked cards ──► /worklist page
        │
        └─ dispositionWorklistItem ── actor audit (F3 / fallback) ──► AppState
```

**New modules (under `src/`):**

| Path | Responsibility |
|---|---|
| `src/domain/weight-trend.ts` | `evaluateWeightTrend()` — deterministic today-vs-7-day-baseline, rule classification, plain-language narrative. **[FIX]** `summarizeBpTrend` (`adherence.ts:70`) is a *half-split average of `systolic`*, **not** a today-vs-baseline diff and needs ≥5 readings (`MIN_TREND_READINGS`, module-local). It is a **prose/shape template only** — the algorithm is genuinely new. |
| `src/domain/hf-config.ts` | `HeartFailureConfig` + `DEFAULT_HF_CONFIG` (thresholds + `ThresholdSource` + F5 `SourceCitation`). Values live here / on the care plan, never in `condition-lens.ts`. |
| `src/domain/hf-safety.ts` | `classifyHfSymptom(SymptomCheckIn)` → `{ tier }`. Pure, no LLM. The structured rest-vs-exertional distinction free-text regex **cannot** make (see §4 P0-6). |
| `src/domain/worklist.ts` | `buildWorklist(state \| panel)` → ranked `WorklistItem[]`. **[FIX] `severityPriority` (`recent-clinical-reading.ts:116`) is NOT exported** — reuse the *concept* (urgent=3 > clinic=2 > blocked=1) by re-implementing a small local ranker, or export it in this commit. Do not `import { severityPriority }` — it will not resolve. Includes FR-16 missing-data items. |
| `src/domain/discharge-protocol.ts` | `buildDischargeProtocol(dischargeEvent, now)` → time-boxed `TaskItem[]`; `diffMedList(prior, discharge)` → added/removed/dose-changed. |
| `src/app/worklist/page.tsx` | Clinician ranked worklist + one-click disposition. **Fixture data only in P0** (route convention matches existing flat `src/app/<name>/page.tsx`). |
| `src/components/weight-ritual.tsx` | ≤15s ritual (weight input + 3-option symptom + caregiver-proxy toggle). |
| `src/components/discharge-panel.tsx` | Med-recon diff + per-med confirm reusing `DoseEvent`/`MedicationBarrier`. |
| `src/i18n/monitoring-strings.ts` | EN/ES catalog for ritual/banners/protocol; registered into the parity loop (F9 or P0-10 fallback). |

**Existing modules to extend (verified symbols):**

- `src/domain/types.ts` — add `WeightReading`, `SymptomCheckIn`, `DischargeEvent`, `WorklistItem` (+ `WorklistDisposition` if F3-fallback); add `weightReadings`, `symptomCheckIns`, `dischargeEvent` (and `worklistDispositions?`) to `AppState`; add `heart_failure` to `Condition` (F6). **[FIX] Prefer reusing existing `TaskItem["kind"]` values** (`"reading" | "medicine" | "visit" | "intake" | "privacy"`, `types.ts:77`) for the ritual/protocol tasks — widening the union forces a matching change to the `isTask` guard's kind check (`storage.ts:303`) or stored tasks get sanitized out.
- `src/ai/safety-gate.ts` — `decideSafety()` gains a **guarded** HF branch (§4 P0-7). **Export `CARE_TEAM_ACTIONS`** (currently module-local, line 7).
- `src/domain/safety.ts` — **no weakening.** Do NOT mutate `urgentSymptomPatterns` (it already matches `chest pain`, `shortness of breath`, `trouble breathing`, `new confusion`, `fainting` at lines 23–33, and existing tests depend on that exact behavior). The rest-vs-exertional nuance lives in `classifyHfSymptom` over the structured `SymptomCheckIn`, not in free-text regex.
- `src/domain/care-team-message.ts` — **parameterize** `buildCareTeamMessage(state)` → `buildCareTeamMessage(state, context?)` with optional `{ weightTrend, symptomCheckIn, relevantReadings, adherence }`. Keep the zero-arg-beyond-state path (BP-only, `medications[0]`, `systolic/diastolic`) so `care-team-message.test.ts` passes.
- `src/state/store.tsx` — add `addWeightReading`, `addSymptomCheckIn`, `registerDischarge`, `dispositionWorklistItem` to the `HealthAction` union; each records an audit event via `recordAuditEvent` (actor-bearing after F3). **Reuse the existing `logDose` action for discharge-med confirmation** — do not add `confirmDischargeMed`.
- `src/state/storage.ts` — add `isWeightReading`/`isSymptomCheckIn`/`isDischargeEvent` (+ `isWorklistDisposition` if fallback); wire into `isValidCoreAppState` (readings-style array checks) **and** `isValidAppState`; scope new arrays by `patientId` in `hasValidRelationships` (mirror lines 90–104); add back-fill in `loadStoredState` mirroring the `mealLog`/`doseEvents` pattern at **lines 484–489** (`if (isObject(parsed) && parsed.weightReadings === undefined) parsed.weightReadings = []`, etc.). **[FIX]** Note the current back-fill fills before `isValidCoreAppState`; the new slices are validated in the *full* `isValidAppState` (like `tasks`/`mealLog`/`doseEvents`), so decide per-slice whether it belongs in core or full validation and add a `sanitize*` filter if it should survive a partially-bad blob rather than resetting.
- `src/domain/fixtures.ts` — add an HF demo patient (Mrs. Lee, weight history that crosses a threshold) and a post-discharge patient (Mr. Ortiz).
- `src/domain/tasks.ts` — `buildTodayTasks()` emits the ritual task for HF patients. **[FIX] `MAX_TODAY_TASKS = 3` and the final `.sort().slice(0,3)` (`tasks.ts:102`) mean a new HF task competes for a slot and can crowd out the BP-threshold safety task (`task-bp-clinical`, priority 1).** The ritual must be priority 2–3 so it can never displace a priority-1 clinical-reading task; add a test asserting the clinical task is never dropped when both exist.

**What stays deterministic (never LLM):** `evaluateWeightTrend`, `classifyHfSymptom`, `buildWorklist` ranking, `diffMedList`, all threshold/red-flag classification. Per FR-3, FR-6, FR-17.

---

## 4. Work Breakdown (sequenced)

### Milestone P0-A — Foundations wiring & data model (do first, atomic)

- [ ] **P0-1 — Add `heart_failure` (F6).** `"heart_failure"` in `Condition` (`types.ts:19`), the `isCarePlan` guard (`storage.ts:372`), a real `heartFailureLens` (fluid/sodium `NutrientRule`s — not empty stubs) + `case` in `selectLens` (`condition-lens.ts:139–149`), HF fixture. *AC:* an HF care plan round-trips `loadStoredState`; `selectLens("heart_failure")` returns the HF lens; `condition-lens.test.ts` passes.
- [ ] **P0-2 — Audit actor (consume F3, or the §2 fallback slice).** *AC:* a disposition writes actor identity/role + action + reason (for snooze) + timestamp and round-trips storage validation; if fallback, `worklistDispositions` is guarded, back-filled, and patientId-scoped.
- [ ] **P0-3 — New domain types + `AppState` slices.** Add `WeightReading`, `SymptomCheckIn`, `DischargeEvent`, `WorklistItem`; add the three slices to `AppState`. *AC:* compiles, no `any`.
- [ ] **P0-4 — Storage guards + migration.** New guards; wire into `isValidCoreAppState`/`isValidAppState` + `hasValidRelationships`; back-fill in `loadStoredState` (lines 484–489 pattern). *AC:* a v0.1 blob (no weight fields) loads without discard; a malformed weight reading is sanitized out (not a full reset); `storage.test.ts` extended and green.

### Milestone P0-B — Deterministic evaluation (the safety core — **no dependency on `task_e569880c`**)

- [ ] **P0-5 — `evaluateWeightTrend()`.** Today vs. rolling 7-day baseline; classify against `HeartFailureConfig` (≥3 lb/24h, ≥5 lb/7d, sustained upward slope); return `{ direction, crossedRule|null, narrative, evidence }`. Exclude implausible readings from the math and mark `needs_review`. No LLM. *AC (named tests):* below-threshold → no `crossedRule`; 3.2 lb/24h → `crossedRule`; implausible 600 lb excluded from baseline; narrative plain-language + carries an evidence label.
- [ ] **P0-6 — `classifyHfSymptom()`.** `SymptomCheckIn` → `{ tier }`: dyspnea `at_rest` / syncope / chest pain / new confusion → hard; `exertional` "more than usual" / edema `more` → soft; else none. *AC:* per-field mapping tests; **`exertional` ≠ `at_rest`** explicitly asserted.

### Milestone P0-C — Patient loop (the ≤15s ritual)

- [ ] **P0-7 — Safety-gate HF branch. [FIX — the correctness-critical task.]** Extend `decideSafety()` so that, **only when `state.carePlan.condition === "heart_failure"` AND an HF signal is present** (a `SymptomCheckIn` in the request/state or a `crossedRule` from `evaluateWeightTrend`), it consults `classifyHfSymptom` + `evaluateWeightTrend`: `tier==="hard"` → `hard_escalate` (escalation is the whole answer, provider not called, urgent-care + 911 language); threshold cross or `tier==="soft"` → `soft_escalate` (banner naming the crossed threshold + **exported** `CARE_TEAM_ACTIONS`). Place the hard branch below `crisis_escalate` (once `task_e569880c` lands) and above the stored-vitals branches. **The gating is what keeps every existing fixture on its current path** (existing fixtures have no HF condition / no `SymptomCheckIn`, so the branch returns nothing and control falls through to the unchanged stored-vitals logic at `safety-gate.ts:48–86`). *AC:* dyspnea-at-rest on an HF patient → `hard_escalate` (provider not called); threshold trend → `soft_escalate` with the named threshold in the banner; **`safety.test.ts` + `safety-gate.test.ts` + `safety-dose-change.test.ts` pass with zero assertion edits**; a new ordering test asserts a co-occurring high BP does not demote an HF hard-escalate, and (post-crisis-merge) `crisis_escalate` still outranks HF.
- [ ] **P0-8 — Reducer actions for capture.** `addWeightReading` + `addSymptomCheckIn`; each appends + records an audit event. *AC:* dispatch adds the record + one audit event; `store.test.ts` extended.
- [ ] **P0-9 — `weight-ritual.tsx` + Today task.** Weight input (manual), 3-option symptom, caregiver-proxy toggle. `buildTodayTasks` emits the ritual at **priority ≥2** so it cannot displace `task-bp-clinical`. *AC:* HF patient sees the ritual; submit logs both records; below-threshold → "Logged, you're steady"; crossing → soft-escalate banner + actions; **test asserts a priority-1 clinical task is retained when both compete for the 3-slot cap**; Playwright covers the happy path.
- [ ] **P0-10 — EN/ES strings + parity (F9, with fallback).** Register `monitoringStrings` (EN+ES) for ritual/banners/protocol; wire into the generalized parity loop **or**, if F9 hasn't landed, add a second parity `it()` over `monitoringStrings` in `strings.test.ts`. *AC:* deleting one ES key fails `npm run test`.

### Milestone P0-D — Discharge protocol

- [ ] **P0-11 — `registerDischarge` + protocol builder.** `buildDischargeProtocol(event, now)` → countdown `TaskItem`s (reusing existing `kind`s) with deadlines relative to discharge; `diffMedList(prior, discharge)`. A red-flag inside the 48–72h window escalates **one tier higher** than baseline. *AC:* protocol seeded with correct relative deadlines; diff returns added/removed/dose-changed; in-window red-flag is tiered up.
- [ ] **P0-12 — `discharge-panel.tsx` med reconciliation.** Diff UI; per-med confirm via `logDose` (`DoseEvent` + `MedicationBarrier` `confused`/`ran_out`/`cost`); any dose-change question routes to the existing `medicationChangePatterns` block + drafted message. *AC:* confirm writes a `DoseEvent`; "which should I stop?" is hard-blocked and offers a draft; e2e covers confirm + block.

### Milestone P0-E — Worklist (flagship surface, fixture data)

- [ ] **P0-13 — `buildWorklist()` ranking.** Ranked `WorklistItem[]`: one patient, one reason, suggested action, `EvidenceStatus` badge. Rank by the re-implemented severity concept (urgent>clinic>blocked; do **not** import `severityPriority`) + `TaskItem.priority`. Enforce FR-5 (no item without a crossed rule + a "why") and FR-16 (missing-data ≥2 days → low-priority item, never reassurance). *AC (named tests):* below-threshold patient → zero cards; crossing patient → one card with threshold + suggested action; stopped-weighing patient → low-priority missing-data card whose copy is asserted **not** to be reassurance; ordering deterministic.
- [ ] **P0-14 — Auto-draft outbound (extend `buildCareTeamMessage`).** Parameterize to accept `{ weightTrend, symptomCheckIn, relevantReadings, adherence }`; output is a draft. *AC:* zero-arg call still returns the BP-only message (existing test green); HF call includes weight trend + symptom line + adherence context.
- [ ] **P0-15 — `dispositionWorklistItem` + `/worklist` page.** Reducer action writing an actor-bearing record (F3 / fallback); page renders ranked cards with Acknowledge / Message (opens pre-drafted) / Book / Snooze-with-reason; cards clear when dispositioned; empty-is-good default. *AC:* dispositioning clears the card and writes actor+action+reason+timestamp; snooze requires a reason; e2e disposes a card and asserts it clears + an audit/disposition record exists.

---

## 5. Data Model & Storage Changes

**New types (`src/domain/types.ts`):**

```ts
export type Condition = "hypertension" | "diabetes" | "obesity" | "heart_failure"; // F6

export type WeightReading = {
  id: string; patientId: string;
  weightLb: number;
  measuredAt: string;               // ISO
  contexts: MeasurementContext[];   // reuse existing union
  note: string;
  source: EvidenceStatus;           // deliberate addition — HomeReading has NO source field
};

export type DyspneaLevel = "none" | "exertional" | "at_rest";
export type SymptomCheckIn = {
  id: string; patientId: string;
  recordedAt: string;
  dyspnea: DyspneaLevel;
  orthopneaPillows: number | null;
  edemaChange: "less" | "same" | "more";
  weightPerception: "down" | "same" | "up";
  loggedByProxy: boolean;
  source: EvidenceStatus;
};

export type DischargeEvent = {
  id: string; patientId: string;
  dischargedAt: string; facility: string; diagnosis: string;
  reconciledMedList: Array<{ name: string; dose: string; schedule: string }>;
  followUpWindowDays: number;
} | null;

export type WorklistItem = {                 // computed, not persisted
  id: string; patientId: string; patientName: string;
  reason: string; suggestedAction: string;
  severity: 1 | 2 | 3;
  evidence: EvidenceStatus;
  trend?: { direction: "improving" | "steady" | "rising"; crossedRule: string | null };
  kind: "weight_trend" | "post_discharge" | "missing_data";
};
```

**HF config (`src/domain/hf-config.ts`)** — thresholds carry `ThresholdSource` + F5 `SourceCitation`; live here / on the care plan, **not** on `ConditionLens`:

```ts
export type HeartFailureConfig = {
  gain24hLb: number;        // default 3
  gain7dLb: number;         // default 5
  slopeLbPerDay: number | null;
  missingDataDays: number;  // default 2 (FR-16)
  thresholdSource: ThresholdSource;
  citation: SourceCitation; // from F5
};
```

**`AppState` additions:** `weightReadings: WeightReading[]`, `symptomCheckIns: SymptomCheckIn[]`, `dischargeEvent: DischargeEvent`, and (fallback only) `worklistDispositions: WorklistDisposition[]`.

**New `HealthAction` variants:** `addWeightReading`, `addSymptomCheckIn`, `registerDischarge`, `dispositionWorklistItem`. Reuse `logDose` for discharge-med confirmation.

**`TaskItem.kind`:** **reuse existing values** (`"reading"`/`"medicine"`/`"visit"`) — widening the union requires a matching `isTask` guard change (`storage.ts:303`) or stored tasks get sanitized out (`sanitizeTasks`, line 402). Only widen if a distinct icon is genuinely needed, and then update `isTask` in the same commit.

**Migration:** `loadStoredState` back-fills the three slices for pre-existing state (mirror `mealLog`/`doseEvents` at lines 484–489). `hasValidRelationships` scopes the new arrays by `patientId`. Decide per slice whether it validates in `isValidCoreAppState` (reset-on-bad) or via a `sanitize*` filter in the full pass (drop-bad-item, keep-state) — prefer sanitize for reading arrays so one bad row doesn't wipe the patient. The F3 `AuditEvent` shape change carries its own legacy-event `system`-actor migration, owned by F3.

---

## 6. AI / Model Wiring

| Path | Model | Notes |
|---|---|---|
| Threshold/slope math, red-flag classification, worklist ranking, med-list diff | **None (deterministic, `domain/`)** | FR-3, FR-6, FR-17. Rules decide escalation; the LLM never gates safety. |
| Daily "you're steady / worth a call" copy; routine care-team draft from template | **Haiku** | High-volume daily path. Falls back to the deterministic narrative string from `evaluateWeightTrend` if the LLM is down (FR-17). |
| Multi-signal worklist reason; coach trend explanation | **Sonnet** | Analysis/generation. **P1** — P0 uses the deterministic narrative + a templated reason. |
| Coach conversational responses | **Streaming** | Existing chat path; reuse Realtime (`realtime-session.ts`) for optional P1 voice check-in. |

**Flow through the gate:** the deterministic HF evaluation runs **before** the provider is called; `hard_escalate` returns the escalation as the whole answer (provider never invoked, matching the existing `hard_escalate` path at `safety-gate.ts:115–122`); `soft_escalate` calls the provider then attaches the deterministic banner + exported action constants. **If the LLM is unavailable, deterministic escalation still fires** and the patient sees their reading + clinic phone (FR-17) — enforced by a test that stubs `provider.respond` to throw and asserts the banner + reading + phone still render. Coach system-prompt contract (`healthAiSystemPrompt` in `prompts.ts`: label each fact confirmed/patient-reported/imported/inferred/needs-review; no diagnosis/dosing) applies unchanged to trend explanations (FR-12).

---

## 7. Testing Strategy

**Vitest unit (deterministic core — highest value):**
- `weight-trend.test.ts` — below-threshold → no `crossedRule`; ≥3 lb/24h and ≥5 lb/7d each fire; sustained-slope case; **implausible reading excluded from baseline and marked `needs_review`**; narrative carries an evidence label.
- `hf-safety.test.ts` — dyspnea `at_rest`→hard, `exertional`→soft, syncope/chest pain/new confusion→hard, edema `more`→soft; **`exertional` ≠ `at_rest`** asserted.
- `worklist.test.ts` — FR-5: no crossed rule → zero cards; FR-16: ≥2 missed days → low-priority missing-data card with copy asserted **not** to be reassurance; deterministic ranking; every card carries a threshold + suggested action.
- `care-team-message.test.ts` (extend) — zero-arg unchanged (BP-only); HF-context call includes weight trend + symptom + adherence.
- `discharge-protocol.test.ts` — correct relative deadlines; diff added/removed/dose-changed; in-window red-flag tiered up.
- `tasks.test.ts` (extend) — **HF ritual task never displaces the priority-1 clinical-reading task under the 3-slot cap.**
- `store.test.ts` / `storage.test.ts` (extend) — new actions mutate + audit; new slices round-trip; v0.1 blob back-fills without discard; malformed reading sanitized (not full reset).

**Safety-regression tests that MUST stay green (do not modify assertions):**
- `safety.test.ts`, `safety-gate.test.ts`, `safety-dose-change.test.ts`. **The gating in P0-7 is precisely what preserves these** — verify by running them unchanged. The existing `safety-gate.test.ts` cases that assert stored-vitals wins over blocked free-text input (e.g. "escalates for dangerous state reading even when patient input is blocked") and that an older chest-pain reading wins over a newer threshold reading are the ones the HF branch must not disturb.
- **New ordering test:** HF hard-escalate sits below `crisis_escalate` (post-`task_e569880c`) and a co-occurring high BP cannot demote an HF red-flag out of hard-escalate.
- **LLM-outage test (FR-17):** provider stubbed to throw → deterministic escalation still fires + reading + clinic phone shown.

**Playwright e2e (`e2e/between-visit.spec.ts`, new — only `home-health.spec.ts` and `food-lens.spec.ts` exist today):** HF ritual steady case → "you're steady, no alert"; crossing case → banner + care-team actions; discharge med-recon confirm + the "which pills to stop" hard-block; worklist card disposition clears the card and writes a record.

**Gate:** `npm run check` green (lint + `vitest run` + `next build`), including the parity test over `monitoringStrings`.

---

## 8. Rollout, Flags & Verification

**No flag framework** — env toggles only (`HEALTH_AI_PROVIDER=mock|openai`, `HEALTH_AI_API_KEY`). P0 runs fully on `HEALTH_AI_PROVIDER=mock` (default): all deterministic escalation + the worklist work with zero API key and zero network; the mock provider returns templated copy so the Haiku daily-copy path is demoable offline.

**Local P0 verification (developer runbook):**
1. `npm run dev`; reset to the HF fixture (Mrs. Lee) via the existing privacy/reset surface.
2. Today shows the weight ritual → log a steady weight → "you're steady," no worklist card.
3. Log a weight 3+ lb over yesterday + answer "more short of breath" → soft-escalate banner + care-team actions; open `/worklist` → one ranked card with crossed threshold + suggested action.
4. Register the demo discharge (Mr. Ortiz) → protocol tasks with countdown deadlines; in the med-recon panel confirm a med, then ask "which pills do I stop?" → hard-blocked + drafted message.
5. On `/worklist`, Snooze-with-reason → card clears; the privacy/audit surface shows actor + action + reason + timestamp.
6. Set `language: "es"` on the fixture → all ritual/banner/protocol copy renders in Spanish.

**Gate before any real-PHI use (do NOT cross in P0):** F1 backend + F5 counsel sign-off on the threshold-suggested-action CDS classification + F10 licensed HF-threshold dataset sign-off. The worklist stays **fixture-only** until F1 + F3 land.

---

## 9. Risks, Open Questions & Decisions Needed

- **[Regulatory — counsel, F5]** A rule-based threshold recommending a *specific action* ("same-day diuretic review") is close to the SaMD vs. non-device-CDS line (Cures §520(o)(1)(E)). Mitigations built in (physician decides, data always shown, framed as decision-support). **Decision:** does P0 "suggested action" copy stay on the non-device side, or soften to "consider contacting your clinic"? Blocks the first patient-facing suggested-action string.
- **[Clinical — physician sign-off, F10]** 3 lb/24h · 5 lb/7d have imperfect predictive value. Ship defaults as `standard_education` for demo; a named clinical owner signs off (dated dataset) before real patients. A learned slope model re-triggers the SaMD question — out of scope until legal review.
- **[Safety-gate ordering]** The HF branch's placement relative to `crisis_escalate` and stored-vitals is only safe because it is **gated on HF-condition + present signal**. If a future change makes the HF branch fire on non-HF state, it could reorder existing escalations — the ordering test is the guard against that.
- **[Product]** Worklist ranking weight — how to combine severity with `TaskItem.priority` when both apply. P0 uses severity-first, priority-as-tiebreak; confirm with an RN in P1.
- **[Coordination — `task_e569880c`]** Exact merged action-constant name and branch order. Only P0-7's final wiring depends on it; the deterministic core does not.
- **[Operational — biggest real-world risk]** The worklist only works if an RN works the queue daily; without staffed, reimbursed capacity the firehose returns.
- **[Billing]** Manual-entry days may not count toward RPM's ≥16 device-transmission-day requirement — a real constraint on manual-first P0 as a billing vehicle; surfaces in P1 device work (F7 source tag).

---

## 10. Effort & Sequencing Estimate

| Milestone | Size | Notes |
|---|---|---|
| P0-A (foundations wiring, data model) | **M** | Type + guard + migration plumbing; low risk but touches storage carefully; F6 must be one atomic commit. |
| P0-B (deterministic evaluation) | **M** | The safety core; highest test density; **no `task_e569880c` dependency** — land it and its tests first, green in isolation. |
| P0-C (gate branch + ritual + i18n) | **L** | P0-7 is the correctness-critical task (gating discipline); UI + reducer + strings + e2e. |
| P0-D (discharge protocol) | **M** | Time-boxed tasks + med diff + reuse of dose/barrier primitives. |
| P0-E (worklist + disposition) | **L** | Flagship surface; ranking + disposition audit; new page + e2e. |

**Build order:** P0-A → P0-B (deterministic core + tests, no gate dependency) → P0-C (P0-7 gate wiring; coordinate `CARE_TEAM_ACTIONS` export with `task_e569880c` but do not block on it) → P0-D → P0-E. P0-A is one coherent change so no partial state persists.

**P1 (sized separately):** Bluetooth scale via F7 hook (**L**), Sonnet multi-signal reasons (**M**), missing-data/time-to-disposition instrumentation (**S**), voice check-in via Realtime (**M**), Health Brief sections (**S**). **P2** (all gated on F1): compliant backend, ADT, FHIR read/write, multi-clinic dashboard, RPM/TCM billing capture.
