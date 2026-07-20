# Screening Hub — Registry-Driven High-Yield Questionnaire Engine

**Paste-ready end-to-end handoff for Codex. Execute P0→P5 in order, no per-phase stops. All build work lands in `C:\Patient centered` (Next.js 15 / React 19 / TS strict / Tailwind 3 / useReducer+localStorage / vitest 2 / Playwright, Windows, npm). Solo repo, direct path-scoped commits to `master`, NO push, no PRs.**

**Codex, read this first:**
- Read `docs/specs/10-screening-hub.md` before P0 — it is the product spec; this plan is the execution contract. Where they disagree, this plan wins; note the deviation in the commit body.
- Verification cadence: after EVERY phase run `npm run check` AND `npm run crisis:gate` (both must be green with zero env vars — the gate is four vitest suites, cheap, and every phase touches a `/checkin` surface). Run `npm run test:e2e` in P0 and P5. If something is red for an out-of-scope reason: stop and report.
- Path-scoped commits only: `git add <explicit paths>`, never `git add .` or `-A`. One commit per phase, message format given per phase.
- SHARED TREE — do not touch: `src/domain/dr-triage.ts` (LOCKED clinical table, tests assert verbatim), `src/domain/screening-gap.ts`, `src/domain/crisis-red-flags.ts` and its corpus (you are adding NO free-text surfaces, so you need NO new crisis rules), `rhtp`-anything (retired), any file under `docs/plans/0*`–`11`.
- House style: TS strict, no `any`, `const` over `let`, no comments or annotations on code you didn't change. JSX quirk: this repo uses the classic runtime in tests — keep `import React` in test files that render JSX if the sibling tests do.
- **Never paraphrase a validated instrument.** Item text is either verbatim from the authoritative source or the instrument ships `wordingVerified: false` with the visible draft badge. This is a clinical-integrity line, not a style preference.

## Mission

Decision (user, 2026-07-20): **screening delivery is the product.** The app has proven safe questionnaire delivery exactly once (PHQ-9) and then hand-rolled two more one-offs (social screen, family screen). This sprint builds the generic engine and ships the highest-yield, legally-embeddable public-health screenings for a Kentucky safety-net population: a 2-minute front-door battery, KY-critical cancer/metabolic eligibility modules, a perinatal depression pathway, and caregiver-completed child/teen instruments wired into the Family Navigator. Detection instruments are settled science; **delivery is the gap**.

## Context — the base app today (verified 2026-07-20 at `eccdcd8`)

- PHQ-9 lives in `src/domain/assessment.ts` (bilingual `{id,en,es}` items, shared 0–3 options, `PHQ9_CONSENT`, pure `scorePhq9`, `phq9Item9IsPositive` = any nonzero item 9, `severityBandSummary` non-diagnostic copy) and is delivered by `src/app/checkin/page.tsx` + `src/components/phq9-check-in.tsx` (consent gate → RHF/zod all-items-required form).
- On item-9 positive, `checkin/page.tsx` records the event normally, dispatches a crisis `AiMessage` (`mode:"trouble"`, `safety:"crisis"`, `content: tSafety(language,"crisisResponse")`, `actions: CRISIS_ACTIONS` from `src/ai/safety-gate`), and swaps the severity summary for the crisis panel. The store audits `crisis_escalated`. **This exact behavior is the contract for every crisis item.**
- `src/state/storage.ts` `isAssessmentEvent` (~line 328) hardcodes `instrumentId === "phq9"` and 0–3 item range. The real failure mode is worse than a row drop: `loadStoredState` gates on `isValidCoreAppState` (~line 1004) which runs `assessmentEvents.every(isAssessmentEvent)` BEFORE any sanitization — **a single non-phq9 row today hard-resets the ENTIRE state to `defaultDemoState` on reload.** `sanitizeAssessmentEvents` (~line 910) only ever sees rows that already passed the core check. House atomic rule: type + guard + core-validity edit + regression test in one commit.
- `src/domain/tasks.ts` `isCheckinDue` (14-day cadence off latest `recordedAt`) and the 60-day quiet recall window are the de facto scheduler; `/today` caps at 3 chips (`MAX_TODAY_TASKS`).
- `src/domain/front-door.ts` `decideFrontDoor` screens crisis/safety/social-emergency FIRST (line 132) — new route entries are automatically crisis-precedence-safe. The lockstep test asserts `CLASSIFIER_HREFS` (= the keys of `ROUTE_SYNONYMS` in `src/domain/route-classifier.ts`) against `MENU_GROUPS` (`front-door.test.ts` ~line 153): a new menu route needs a `ROUTE_SYNONYMS` entry (plus a `ROUTE_LABELS` entry in `front-door.ts` for its classifier label) or the suite fails. `/checkin` is already registered in all three — P5's synonym appends need no new route.
- `src/domain/nudge-template.ts` renders ONLY approved templates with prohibited-term lint. `src/domain/family-stages.ts` `buildFamilyStages(family, now, language)` derives now/next/later stages from birth dates — pure date math, `backdatedDiagnosisMonth`-style demo controls, never fake the clock.
- `src/domain/health-brief.ts` composes nullable provenance-labeled sections (`eyeScreeningSection` reuses the screening lens — the precedent for `screeningsSection`).
- `src/domain/sdoh-resources.ts` `findKentuckyResources({county, needType})` is the KY resource matcher the Hunger Vital Sign positive hands off to.
- i18n: inline `{en,es}` on domain data + per-feature `tX(language,key)` tables; language source is `state.patient.language`. The es toggle is NOT on master (branch `claude/fervent-joliot-ffd33f`) — you still ship full es parity; the demo fixture can select es.

## What already exists — DO NOT rebuild

1. Crisis gate, safety copy, `CRISIS_ACTIONS`, `crisis_escalated` audit seam (`src/ai/safety-gate.ts`, `src/i18n/strings.ts` `tSafety`) — consume, never modify.
2. The DR screening loop (`/screening`, gap machine, triage, recalls) — a different product surface; do not generalize it into this engine.
3. The social screen (`src/domain/social-screen.ts`, `/support`) and family screen (`src/domain/family-screen.ts`) — leave them as-is; migrating them into the registry is explicitly out of scope.
4. Accessibility shell, audit-event discipline, `renderNudge` lint machinery — consume as-is.

## Scope decisions (locked)

1. **One engine, instruments as data.** `src/domain/instruments/` holds one file per instrument exporting a `ScreeningInstrument`; a single `INSTRUMENTS` registry; one generic runner component. Adding an instrument later = data file + tests, zero engine edits.
2. **`assessmentEvents` is the only persistence.** `instrumentId` widens to registry-validated string; `severityBand` widens to `string` validated against the instrument's `bands`. No new AppState arrays, no new audit verbs (`assessment_recorded` covers all instruments; label = registry title.en).
3. **Crisis behavior is frozen.** `crisisOnPositive` items (PHQ-9 item 9, PHQ-A item 9) reproduce the current `/checkin` crisis flow exactly — event records, crisis `AiMessage` dispatched, crisis panel rendered, fixed `tSafety` copy. No ASQ second stage, no new pathway, no new corpus rules.
4. **The threshold tables below are LOCKED** — tests assert them verbatim; do not "improve" clinical cutoffs.
5. **Licensing is a build gate.** Only the instruments named in the phases are built. EPDS, M-CHAT-R/F, CRAFFT, Mini-Cog, PROMIS, HARK, AHC-HRSN, PEARLS, ASQ-3, PEDS, SCARED get NO code (registry slots may be named in a comment block only).
6. **No free text anywhere in the engine.** Choice and number inputs only → no LLM calls, no grounding surface, no new crisis-classifier obligations.
7. **Derived values are computed, never asked**: pack-years = packs/day × years; BMI from height/weight.
8. **Hub takes over `/checkin`.** `/checkin` = hub, `/checkin/[instrumentId]` = runner. PHQ-9's existing e2e, `tasks.ts` href, and front-door entries are updated in P0 — same phase, no broken window.
9. **Wording integrity**: `wordingVerified:false` instruments render the draft badge (en: "Draft wording — verify against the official form before clinical use." / es parity). PHQ-2/PHQ-9/GAD-2/GAD-7/HVS/tobacco/NIDA/AUDIT-C/STEADI-3/prediabetes wording is well-established — transcribe carefully and set `true`. SWYC, PSC-17, PHQ-A ship `false` until the user verifies against official PDFs.

## Non-goals (do not build)

- No IPV screening (HARK, AHC-HRSN safety block, SWYC Family Questions). Prerequisites (privacy pre-check, quick exit, exclusion from family-visible surfaces, no notification content) are a future sprint. SWYC ships Milestones + POSI components only for exactly this reason.
- No ACEs/PEARLS (mandatory-reporter + score-determinism issues unsolvable in self-serve demo).
- No EPDS (RCPsych written permission required for app embedding — perinatal pathway uses PHQ-2→PHQ-9, USPSTF-acceptable), no M-CHAT-R/F (Robins electronic-use permission — POSI substitutes), no CRAFFT (Boston Children's approval), no Mini-Cog (Borson permission + drawing capture), no PROMIS (HealthMeasures tech license), no ASQ-3/PEDS (paid), no C-SSRS/DAST/HITS/MoCA/MMSE/Beck/SF-12/Morisky (licensing; PDC already beats Morisky).
- No server persistence, no real SMS, no provider dashboard, no gamification, no new npm dependencies, no Prisma/schema anything (this app has none).
- No changes to `dr-triage.ts`, `screening-gap.ts`, crisis rules/corpus, social screen, family screen.

## Guardrails (every phase)

- Path-scoped `git add`; one commit per phase; NO push, no PRs.
- Atomic type+guard rule: any `AppState`/`AssessmentEvent` shape change lands in the same commit as matching `storage.ts` guard/sanitizer edits + a regression test proving a pre-sprint stored payload still loads (house tripwire: `sanitizeAssessmentEvents` must never become a reset-to-demo vector; unknown `instrumentId` → row filtered, state preserved).
- All new patient-facing strings en + es with parity-test coverage; instrument items inline `{en,es}`.
- Every new domain lib gets a vitest suite; every new page/component an RTL test; threshold tables and band copy locked verbatim in tests.
- After every phase: `npm run check` green with zero env vars. `crisis:gate` green whenever `front-door.ts`, `checkin`, or any crisis-adjacent surface changed. Never weaken an existing test to get green.

## Cross-cutting contract (P0 establishes; everything compiles against it)

```ts
// src/domain/instruments/types.ts
import type { Language } from "@/i18n/strings";

export type ResponseOption = { value: number; en: string; es: string };
export type InstrumentItem = {
  id: string;
  kind: "choice" | "number";
  en: string;
  es: string;
  options?: ResponseOption[];      // choice: per-item override of defaultOptions
  min?: number;                    // number items only
  max?: number;
  crisisOnPositive?: boolean;      // any value > 0 → crisis flow (LOCKED behavior)
  conditionalOn?: { itemId: string; atLeast: number }; // asked only when the named item's response >= atLeast
  notApplicableValue?: number;     // REQUIRED with conditionalOn: when the condition is unmet the runner
                                   // pre-fills this sentinel and skips the item, so stored responses are
                                   // ALWAYS items.length long and the storage guard stays fixed-length;
                                   // score() must treat the sentinel as not-applicable
};
export type ScreeningOutcome = { totalScore: number; band: string };
export type ConsentCopy = Record<Language, { title: string; points: string[]; acknowledge: string }>;
export type ScreeningInstrument = {
  id: string;
  title: { en: string; es: string };
  audience: "self" | "caregiver";
  tier: 0 | 1 | 2 | 3;
  items: InstrumentItem[];
  defaultOptions?: ResponseOption[];
  score: (responses: number[]) => ScreeningOutcome;  // pure; reverse-scoring inside
  bands: readonly string[];                          // guard checks band ∈ bands
  bandSummaries: Record<string, { en: string; es: string }>; // ends with not-a-diagnosis copy
  consent: ConsentCopy;
  recurrenceDays?: number;
  followUp?: { minScore: number; instrumentId: string };     // chaining, e.g. phq2→phq9
  wordingVerified: boolean;
  licenseStatus: "clear" | "pending";                // "pending" renders the license-pending banner and
                                                     // excludes the instrument from nudges/stage links
                                                     // until a human flips it (SWYC — see P4)
  attribution: { en: string; es: string };           // rendered under the form
};
```

`AssessmentEvent` (in `src/domain/assessment.ts`) becomes:

```ts
export type AssessmentEvent = {
  id: string;
  patientId: string;
  instrumentId: string;        // was "phq9"; storage validates against INSTRUMENTS
  itemResponses: number[];     // index-aligned to instrument items
  totalScore: number;
  severityBand: string;        // was SeverityBand; storage validates ∈ instrument.bands
  status: "patient_reported";
  recordedAt: string;
};
```

**LOCKED — Tier-0 battery & expansion thresholds:**

| Instrument (`id`) | Items | Positive rule | Consequence |
|---|---|---|---|
| `phq2` | 2, options 0–3 | total ≥ 3 | followUp → `phq9` |
| `gad2` | 2, options 0–3 | total ≥ 3 | followUp → `gad7` |
| `hunger_vital_sign` | 2, often(2)/sometimes(1)/never(0) | either item ≥ 1 | band `positive` → /support resources card + insulin-hypoglycemia note |
| `tobacco_use` | 2 (item 1 BRFSS current use: every day(2)/some days(1)/not at all(0); item 2 BRFSS ever-use, verbatim: "Have you smoked at least 100 cigarettes in your entire life?" yes/no, `conditionalOn` item 1 = not-at-all) | item 1 ≥ 1 = current; item 2 yes with item 1 = 0 → former | Quit Now Kentucky card (current); current OR former → unlocks `lung_ldct_eligibility` |
| `nida_single` | 1, number 0–365 — item text must include the validated parenthetical clause "(for example, because of the experience or feeling it caused)" verbatim | ≥ 1 | band `positive` → care-team conversation card + privacy note |

**LOCKED — scored-instrument bands:** `phq9`/`phq_a`: 0–27 over the 9 scored items; 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately_severe, 20–27 severe; item 9 `crisisOnPositive` (phq_a's supplemental suicide items: see P4). `gad7`: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe. `audit_c`: positive ≥4 (men) / ≥3 (women) — ask sex-at-birth as item 0 (choice, not stored elsewhere); 10–12 band `high_risk` renders the medically-supervised-withdrawal warning, never "stop now" (10–12 is a deliberately conservative house rule, not an author-validated band — UK PHE materials band 11–12 as possible dependence; tests lock it as policy). `dds2`: 2 items 1–6; mean ≥3 = band `elevated_distress` (distress ≠ depression; route to diabetes-support content, not psychiatry framing). `steadi3`: the 3 CDC key questions (fallen in past year / feel unsteady / worry about falling), yes/no, PLUS a 4th conditional item "Were you hurt or injured when you fell?" (`conditionalOn` item 1 = yes, sentinel = no-fall); any yes = `at_risk`; item 4 yes = band `fall_with_injury` → urgent-tone copy. `psc17`: total ≥15 = `discuss`, OR any official subscale positive: internalizing (items 2,6,9,11,15) ≥5, attention (items 1,3,7,13,17) ≥7, externalizing (items 4,5,8,10,12,14,16) ≥7 — item numbers per the official PSC-17 form order; key the subscale mapping by item id so it survives transcription. `swyc_*`: milestones below age cutoff or POSI ≥3 concerning = `discuss` → First Steps card.

**LOCKED — eligibility logic:** `lung_ldct_eligibility`: eligible ⇔ age 50–80 AND pack-years ≥ 20 AND (current smoker OR quit ≤ 15 years ago); the quit-year item is `conditionalOn` former-smoker with a not-applicable sentinel for current smokers; symptom item (hemoptysis / unexplained weight loss, yes/no) yes → band `see_clinician_now` overriding eligibility. `crc_eligibility`: due ⇔ age 45–75 AND no colonoscopy within 10y AND no FIT within 1y AND no other recent screening modality (one item: "another colon screening test — like a stool-DNA (Cologuard) test in the last 3 years, or a sigmoidoscopy or CT colonography in the last 5 years?" yes → not due, with copy "you may already be up to date — tell your clinician what you've had"); red-flag item (rectal bleeding / iron-deficiency / bowel-habit change) or first-degree family history → `see_clinician_now`, never FIT. `prediabetes_risk` (CDC/ADA, weights verbatim): age 40–49=1 / 50–59=2 / 60+=3; man=1; gestational diabetes=1; first-degree relative with diabetes=1; high blood pressure=1; not physically active=1; BMI 25–<30=1 / 30–<40=2 / ≥40=3 (<25=0); max 10; total ≥5 = `high_risk` → NDPP referral card; BMI computed from height/weight.

**Locked patient-facing copy (en; provide es parity):**
- All-clear: "Nothing you reported needs follow-up today. This is a check-in, not a diagnosis."
- Draft badge: "Draft wording — verify against the official form before clinical use."
- License-pending banner: "Demo preview — not for clinical use until the electronic-use agreement is in place."
- Privacy note (NIDA/AUDIT-C): "Your answers stay on this device. You choose if and when to share them."
- Withdrawal warning (AUDIT-C 10–12): "Cutting back suddenly after heavy drinking can be dangerous. Talk with a clinician about a safe plan first."
- LDCT eligible card: "A yearly low-dose CT scan is recommended for people like you. It's usually covered at no cost — ask your clinic to check and set it up."

**Shared result seam (LOCKED behavior):** P0 builds a single shared result component (`<InstrumentResult>`) that owns record-event (`addAssessmentEvent` dispatch) + crisis handling (on any `crisisOnPositive` response > 0: dispatch the crisis `AiMessage` with `tSafety` copy + `CRISIS_ACTIONS`, render the crisis panel INSTEAD of any band summary or action cards) + band-summary rendering. **Every surface that completes an instrument — `/checkin/[instrumentId]`, `/checkin/quick`, `/checkin/perinatal` — renders results ONLY through this component.** A crisis positive mid-battery terminates the battery into the crisis panel immediately at that instrument's completion; no further steps, no other action cards.

---

## P0 — Engine core + PHQ-9 port (safety-identical)

**Build:**
- Commit this plan file (`docs/plans/12-screening-hub.md`), the spec (`docs/specs/10-screening-hub.md`), and the modified `docs/specs/README.md` — the row 10 already present in the working tree is final; commit it as-is, do NOT rewrite it.
- `src/domain/instruments/types.ts` (contract above) + `src/domain/instruments/registry.ts` (`INSTRUMENTS` record, `getInstrument(id)`, `isKnownInstrument(id)`); `src/domain/instruments/phq9.ts` porting the existing PHQ-9 data verbatim from `assessment.ts` (items, options, consent, bands, summaries, `recurrenceDays: 14`, item 9 `crisisOnPositive: true`, `wordingVerified: true`, `licenseStatus: "clear"`); keep `scorePhq9`/`phq9Item9IsPositive` exported from `assessment.ts` as thin wrappers over the registry so existing imports and tests keep passing. Tests: registry integrity (every instrument: items nonempty, bands cover score range, en/es parity, bandSummaries for every band, every `conditionalOn` item has a `notApplicableValue`), phq9 port equivalence (same score/band/crisis for identical inputs).
- Widen `AssessmentEvent` per contract; `src/state/storage.ts` **same commit**: `isAssessmentEvent` + `sanitizeAssessmentEvents` become registry-driven (`isKnownInstrument`, responses length === items length, each response within its item's option values or min/max or equal to its `notApplicableValue`, band ∈ instrument.bands). **Also move the per-row `assessmentEvents.every(isAssessmentEvent)` check OUT of `isValidCoreAppState` (~line 1004) — keep only `Array.isArray` there — so unknown-instrument rows reach `sanitizeAssessmentEvents` and are filtered instead of hard-resetting the whole state to demo; this edit is what makes the second regression test pass.** Regression tests: a pre-sprint phq9 payload loads intact; an unknown-instrument row is filtered without resetting state.
- `src/state/store.tsx` **same commit**: the `addAssessmentEvent` case labels the audit event with the registry title.en (fallback "Check-in recorded") instead of the hardcoded string.
- `src/domain/tasks.ts` **same commit**: scope `isCheckinDue` to events with `instrumentId === "phq9"` so later phases' non-mood events cannot reset the 14-day clock of the suicide-item-bearing check-in. Test: a non-phq9 assessment event does not reset the check-in due clock.
- `src/components/instrument-runner.tsx` + test: props `{ instrument, language, onComplete(responses) }` — pure form component, no dispatch; consent phase → items (fieldset/legend full-label radios for choice, labeled number inputs for number, 48px targets; `conditionalOn` items auto-skipped with their sentinel pre-filled) → all-items-required single error line; attribution line rendered under the form; `wordingVerified:false` renders the draft badge; `licenseStatus:"pending"` renders the license-pending banner. RTL tests: consent gating, completeness, badge and banner presence, conditional-skip fills the sentinel.
- `src/components/instrument-result.tsx` + test — **the shared result seam (LOCKED behavior above)**: takes `{ instrument, responses, language }`, dispatches `addAssessmentEvent`, and renders either the band summary or (on any `crisisOnPositive` response > 0) dispatches the crisis `AiMessage` (`tSafety` crisisResponse + `CRISIS_ACTIONS`) and renders the crisis panel instead. RTL test asserts behavior-identical output to the current `/checkin` crisis flow (988 call/text actions present, no band summary).
- `/checkin` hub page: sections "Due now" (derived from recurrence + last event), "Quick check" (P1 placeholder card until P1 lands), "For your family" (renders when family slice exists), "History" (past events with instrument title + band, most recent first). `/checkin/[instrumentId]/page.tsx`: runner + `<InstrumentResult>`; read the segment with `useParams()` from `next/navigation` inside the client page (same hook pattern as `useSearchParams` in `src/app/screening/page.tsx`) — do not accept a `params` prop (this is the repo's first dynamic segment; all pages are client components). Migrate the PHQ-9 flow to `/checkin/phq9`; update `tasks.ts` check-in chip href, `front-door.ts` checkin entries, `/menu` catalog, and the PHQ-9 e2e in `e2e/home-health.spec.ts` to the new path — same commit.
- Run `npm run check`, `npm run crisis:gate`, `npm run test:e2e`.

**Commit:** `feat: registry-driven screening engine with phq9 ported safety-identical (SH P0)`

## P1 — The 2-minute check (tier-0 battery)

**Build:**
- Instrument files + tests (thresholds locked): `phq2.ts`, `gad2.ts`, `gad7.ts`, `hunger-vital-sign.ts`, `tobacco-use.ts`, `nida-single.ts` — all `wordingVerified: true` after careful transcription, all with attribution (Pfizer/phqscreeners; Children's HealthWatch; CDC BRFSS; NIDA/NIH).
- `src/domain/instruments/battery.ts` + test: `TIER0_BATTERY: InstrumentId[]`, `nextBatteryStep(completed, outcomes)` — pure; applies `followUp` chaining (phq2≥3 → phq9, gad2≥3 → gad7) and returns the next instrument or `done`. Tests: all-negative path length 5, each expansion, abandonment mid-battery leaves only completed events.
- `/checkin/quick` page + component: progress ("Check 3 of 5"), one instrument at a time via the runner, every instrument's completion routed through `<InstrumentResult>` (which records the event), exit-anytime. **A `crisisOnPositive` positive terminates the battery into the crisis panel immediately — no further steps, no other action cards (LOCKED shared-result behavior).** Completion screen: all-negative → locked all-clear copy; positives → one action card per positive in tier order — HVS: KY resources card reusing `findKentuckyResources` + insulin-hypoglycemia note when a medication name matches case-insensitive `/insulin|glipizide|glyburide|glimepiride/` over `state.medications[].name` (the default demo fixture has metformin only, so the note is fixture-invisible — test with an added insulin med; test: metformin-only → no note); tobacco current: Quit Now Kentucky 1-800-QUIT-NOW card + "4 quick questions" link to the lung module (link renders disabled with "coming next" copy until P2 lands, then enabled — implement the gate on registry membership, not a TODO); NIDA positive: care-team conversation card + privacy note; PHQ-9/GAD-7 expansions render their band summaries via the shared seam.
- RTL crisis test for the battery: PHQ-2 total ≥3 → PHQ-9 appears → item 9 = 1 → crisis panel replaces the completion screen, remaining battery steps and all other action cards suppressed, crisis `AiMessage` dispatched.
- Hub "Quick check" card goes live → `/checkin/quick`.
- Run `npm run check`, `npm run crisis:gate`.

**Commit:** `feat: 2-minute tier-0 screening battery with conditional expansion (SH P1)`

## P2 — KY eligibility modules + adult expansions

**Build:**
- Instrument files + tests (logic locked above): `lung-ldct-eligibility.ts` (number items packs/day, years smoked, quit-year `conditionalOn` former with not-applicable sentinel, age item since the profile lacks DOB; pack-years computed in `score` via item values — expose a pure `packYears(packsPerDay, years)` helper), `crc-eligibility.ts` (incl. the other-modality suppression item), `prediabetes-risk.ts` (weights verbatim from the locked table; pure `bmiFrom(heightIn, weightLb)`), `audit-c.ts`, `dds2.ts`, `steadi3.ts` (3 key questions + conditional injury follow-up). Tests: boundary cases by name (pack-years 19.9 vs 20, age 49/50/80/81, quit 15y0m vs 15y1m, CRC 44/45/75/76, CRC other-modality yes → not due, prediabetes 4 vs 5, AUDIT-C 3/4 by sex, DDS mean 2.9 vs 3.0, STEADI single-yes, STEADI fell+injured → `fall_with_injury` vs fell+not-injured → `at_risk`); storage regression: a persisted lung event (current smoker, sentinel quit-year) survives `loadStoredState` intact.
- Result cards per band: eligibility `eligible` → recommendation card with the locked LDCT copy ("usually covered at no cost — ask your clinic to check and set it up"); `see_clinician_now` → urgent-tone contact-your-clinic card (no scheduling framing); `high_risk` prediabetes → NDPP referral content; `at_risk` STEADI → falls-prevention card cross-linking `/screening` (vision) and medication review; `fall_with_injury` → urgent-tone copy.
- Hub: tier-2 instruments listed under "Worth checking" with eligibility gating (lung only when tobacco history exists; STEADI only when age ≥65 known or an age item answers it).
- Run `npm run check`, `npm run crisis:gate`.

**Commit:** `feat: KY eligibility modules and adult expansion instruments (SH P2)`

## P3 — Perinatal depression pathway

**Build:**
- `src/domain/perinatal.ts` + test: pure `perinatalCheckpoints(profile: FamilyProfile, now)` deriving the 1/2/4/6-month windows from `birthYear` + `birthMonth` at MONTH granularity (the slice has no day-level dates and exactly ONE profile — `FamilyNavigatorState.profile: FamilyProfile | null`, `types.ts` ~line 369); when `birthMonth` is absent return NO checkpoints (mirror the year-only degradation in `family-stages.ts`); single child only. Demo backdating via the family slice's existing controls, never fake the clock. Tests: window boundaries by month, no-profile → empty, year-only profile → empty.
- Perinatal framing: `/checkin/perinatal` entry that runs `phq2`→`phq9` (unmodified instruments) wrapped in perinatal framing copy (en/es): intro ("Having a new baby is a lot. This 2-question check is for you, not just the baby."), band ≥10 adds "Talk with your OB or pediatrician — they expect this conversation." Results render ONLY through `<InstrumentResult>` (shared seam). RTL crisis test: perinatal run → PHQ-9 item 9 = 1 → crisis panel replaces the summary, crisis `AiMessage` dispatched. EPDS: comment-only registry slot naming the RCPsych permission gate.
- Family Navigator: extend `buildFamilyStages` with perinatal-check stages (timing from `perinatalCheckpoints`) linking `/checkin/perinatal`; new approved nudge template `perinatal_check_nudge_v1` (slots firstName) through `renderNudge` — copy passes the prohibited-term lint (no "depression" in outreach copy; "a quick check-in for you" framing).
- Run `npm run check`, `npm run crisis:gate`.

**Commit:** `feat: perinatal depression pathway anchored to infant checkpoints (SH P3)`

## P4 — Child & teen instruments (caregiver voice)

**Build:**
- Instrument files + tests: `swyc-milestones-18mo.ts`, `swyc-milestones-30mo.ts` (each 10 milestone items, options not-yet(0)/somewhat(1)/very-much(2), age cutoffs per official tables), `swyc-posi.ts` (7 items, ≥3 concerning = `discuss`; offered from BOTH the 18mo and 30mo flows — POSI is validated 16–35 months and the official 30mo form includes it; NOTE: some official POSI items allow multiple checked responses — verify the response format against the official POSI scoring guide at transcription; if a multi-select item cannot be represented, document the single-select simplification in the file header and keep `wordingVerified: false`), `psc17.ts` (subscale mapping keyed by item id per the locked table), `phq-a.ts`.
- **PHQ-A scope (locked decision):** transcribe the full official 13-item "PHQ-9 Modified for Adolescents" — 9 scored items (0–27 total; item 9 `crisisOnPositive: true`) plus the 4 supplemental items; `score()` excludes supplemental items from the total; the past-month serious-suicidal-ideation item AND the lifetime-attempt item are BOTH `crisisOnPositive: true` (deliberately conservative — a historical attempt still routes to the crisis panel; never render the official form with unwired suicide items).
- Licensing: SWYC's steward is the **TEAM UP Center** (Tufts pages redirect there; SWYC is their trademark) and electronic administration requires contacting them — the same electronic-use gate as M-CHAT. SWYC files therefore ship `licenseStatus: "pending"` (license-pending banner rendered, excluded from nudges/stage links until a human flips it after the no-cost agreement lands) AND `wordingVerified: false`. PSC-17/PHQ-A are public domain: `licenseStatus: "clear"`, `wordingVerified: false` until human transcription check. Attribution lines per source ("© Tufts Medical Center / TEAM UP Center; used unmodified"); file-header comment on all five: "TRANSCRIPTION REQUIRED: verify items verbatim against the official PDF before demo".
- Runner caregiver voice: `audience: "caregiver"` renders "Answer about your child" framing and child-name interpolation from the family slice; PHQ-A renders a hand-the-device note ("These questions are for your teen to answer themselves.").
- Positive routing: SWYC/POSI `discuss` → KY First Steps referral card (urgent-not-emergent copy) via the Family Navigator resource catalog; PSC-17 `discuss` → pediatrician-conversation card. All results through `<InstrumentResult>` (PHQ-A crisis items covered by the shared-seam test pattern).
- Family Navigator stages: development-check stages at the 18mo/30mo windows linking the hub; hub "For your family" section lists age-appropriate instruments for the child. Add a demo family fixture (or `/demo` scenario) with `{ birthYear/birthMonth = 18 months before now, schoolStage: "not_school_age", county: "Fayette" }` so acceptance step 5 is clickable — all three current fixtures ship `family: null`, and the 18mo/30mo windows require `birthMonth`.
- Run `npm run check`, `npm run crisis:gate` (phq_a adds crisis items).

**Commit:** `feat: SWYC, PSC-17, PHQ-A child and teen screenings with caregiver voice (SH P4)`

## P5 — Surfacing: due engine, nudges, brief, front door

**Build:**
- `src/domain/instruments/due.ts` + test: `dueInstruments(state, now)` — per-instrument recurrence (phq9 14d stays; battery 90d; audit_c/dds2/eligibility rechecks 365d) + eligibility gates + `licenseStatus === "clear"` filter, derivation-only. `tasks.ts`: replace the phq9-scoped `isCheckinDue` chip with a single quiet screening chip from `dueInstruments` (max one chip, priority below crisis/referral work, 3-chip cap preserved; **when both phq9 and the battery are due, the chip prefers phq9 — the item-9-bearing instrument**). Tests: cadence boundaries, chip suppression when screening work is open, phq9-over-battery chip priority.
- Approved nudge template `checkin_nudge_v1` (slots firstName, checkName) through `renderNudge` + lint test.
- `src/domain/health-brief.ts`: `screeningsSection(state)` — null when no events; else one line per most-recent event per instrument ("Mood check-in (PHQ-9): 7 — mild — Jul 12, patient-reported") + due summary line; `status: "patient_reported"`. Test: null case, formatting, provenance.
- Front door + menu: append checkin-hub synonyms at the END of `NAV_LEXICON`/`_ES` in `front-door.ts` and `ROUTE_SYNONYMS` in `src/domain/route-classifier.ts` ("health check", "wellness check", "questionnaire", "chequeo de salud"); `/checkin` is already in `MENU_GROUPS`/`ROUTE_SYNONYMS`/`ROUTE_LABELS`, so no new route is needed — update the menu card copy to "Check-ins & screenings". Do NOT map "screening" — it stays with DR `/screening`.
- e2e golden path in `e2e/home-health.spec.ts` (or a new `e2e/screening-hub.spec.ts`): quick check all-negative → all-clear; PHQ-2 ≥3 → PHQ-9 → item 9 positive → crisis panel with `tel:988`; tobacco → lung module → eligible card; reload → events persist.
- Run `npm run check`, `npm run crisis:gate`, `npm run test:e2e`.

**Commit:** `feat: screening due engine, nudge template, brief section, front door (SH P5)`

**STOP — do not push.** Report: phases landed, `npm run check` / `crisis:gate` / `npm run test:e2e` output, the golden-path steps, the list of `wordingVerified:false` instruments awaiting human transcription, and the `licenseStatus:"pending"` instruments awaiting the TEAM UP Center electronic-use agreement.

---

## Acceptance demo (must be clickable at the end)

1. `/today` → screening chip → `/checkin` hub → **Quick check** → consent → answer all 5 negative → "Nothing you reported needs follow-up today. This is a check-in, not a diagnosis."
2. Re-run → PHQ-2 total 4 → PHQ-9 appears → item 9 = 1 → crisis panel (988 call/text buttons, `tel:988` present), audit shows `assessment_recorded` + `crisis_escalated`.
3. Re-run → tobacco "every day" → Quit Now Kentucky card → **4 quick questions** → 1.5 packs × 20 years, age 62, current → "a yearly low-dose CT scan is recommended" card.
4. `/visits` Health Brief shows the screenings section with provenance labels.
5. Family fixture with an 18-month-old → Family Navigator shows the development-check stage → SWYC 18mo in caregiver voice with the draft-wording badge → below-cutoff answers → First Steps card.
6. Reload the browser → history intact (pre-sprint phq9 event still listed).
7. es fixture → flows 1–3 in Spanish, crisis copy contains 988.

## If something conflicts

The load-bearing invariants, in order: storage lenient-sanitize (never a reset-to-demo vector), crisis-item behavior byte-identical to the current `/checkin` flow, front-door crisis precedence and route-catalog lockstep, en/es parity, zero-env green `check`. Keep the base app's behavior, adapt the new code, note the deviation in the commit body. Never weaken `crisis:gate` or an existing test to get green. Never paraphrase a validated instrument silently. Never build a licensing-gated instrument because it "seems fine".
