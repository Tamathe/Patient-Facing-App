The critique below is followed by the corrected FINAL plan.

## Critique of the draft (what I verified and what's wrong)

I traced every load-bearing symbol against live source. The draft is unusually well-grounded — most line-number citations check out — but it encodes **two false safety invariants** and **hard-codes gate internals that `task_e569880c` is about to change**. Those are release-gate-level defects, not nits.

**A. The parity test asserts an invariant the real gate does not hold (CRITICAL).**
The draft's DoD #5, §7, and P0-F1 all assert "SBP≥180 → `kind:"hard_escalate"` with emergency framing," and the parity suite is told to assert that. But in the real `decideSafety` (`safety-gate.ts:48–104`), a **stored** reading of 182/96 is evaluated via `findRecentClinicalReading` → `interpretBloodPressure`. If the care plan's `callThreshold` is met (`blood-pressure.ts:11–22`), `bloodPressureInsight.escalation === "clinic"` returns **`soft_escalate`** at line 55–61 — *before* the numeric `hard_escalate` branch at line 63 ever runs. The reading only hard-escalates when it is dangerous **and does not** meet the care-plan threshold. So "SBP≥180 is always hard-escalate" is **false**, and a test asserting it would either fail against real code or (worse) be written to pass and lie. The spec itself (Flow 1, correction #4) makes the same over-simplification. **Fix:** the invariant that is actually true and safe is *"a dangerous vital never resolves to `allowed`, and never softens below the tier the gate assigns to that same text on any channel"* — i.e., parity is **channel-invariance of the gate's own decision**, not a hard-coded tier per input. The test must compare typed-vs-voice outcomes of the *same* string, not assert an absolute tier.

**B. `decideSafety` runs on `request.patientInput`, not on the candidate reading (CRITICAL for Flow 1 wiring).**
The draft's data-flow says "voice-parse → classifySafety("182/96") → render banner NOW." That works only because you feed the normalized string as text. But the DoD then implies the numbers page's committed `HomeReading` drives the banner via the gate — it does not; `decideSafety` reads `request.state.readings` and `request.patientInput`. The "immediate, pre-confirmation" banner must call `classifySafety(normalizedText)` directly at the surface (a pure domain call), *decoupled from* the Coach's `createSafeAiResponse` path. The plan half-says this and half-muddles it. **Fix:** make FR-3's immediate alarm an explicit direct `classifySafety()` call on the parsed/normalized string, and keep the committed-reading path separate.

**C. The plan hard-codes gate ordering and action constants that F4/`task_e569880c` will change (CRITICAL sequencing bug).**
F4 in the foundations doc is explicit: `task_e569880c` makes `crisis_escalate` the **literal first branch**, adds a `CRISIS_ACTIONS` constant, and widens `AiMessageAction` (expected `call_988`). The draft's §7 says the parity suite must assert "stored dangerous-vital branch before free-text branch, matching safety-gate.ts:48–104" — that **pins the current order**, which is exactly what F4 says will move. And the draft never tells callers to import the action constants instead of assuming `["call_clinic","draft_message"]`. **Fix:** the parity/ordering test asserts the **documented tier order by name** (crisis → hard-escalate → soft-escalate → soft-block → allowed) and that a lower-tier co-signal cannot pre-empt a higher one — never a line-number order. Voice renderers consume exported action constants, never literals.

**D. Real-but-minor grounding corrections.**
- `recordAuditEvent(patientId, action, label)` is **3 positional args** (`audit.ts:3–7`), no options object today. Adding a 4th optional `{channel, language}` arg and threading it through the **9 call sites** in `store.tsx` is real work; "back-compatible optional arg" is achievable but must be listed as touching every call site.
- `AuditEvent.action` is a **closed union** with no locale-change member; `setLocale` correctly audits as `"updated"`. Good — but the widened `AuditEvent` needs `isAuditEvent` (`storage.ts:346–360`) to accept optional `channel`/`language`, and `isPatient` (`storage.ts:384–394`) must **not** hard-require `preferredChannel` or legacy blobs wipe to `demoState`. The draft flags this (risk #7) and the back-fill pattern at `storage.ts:484–489` is real. Keep it.
- `connectRealtimeSession`'s `ConnectArgs.language` is already `"en"|"es"` and `injectContext` is food-coupled via `context.identifiedFood`/`flagTexts` (`realtime-session.ts:134–151`). The generalization is genuine, correctly scoped.
- `mockProvider.openLiveSession` (`mock-provider.ts:115`) hard-codes `mode:"food"` and reads `context.identifiedFood`/`frameDataUrl`. Routing Coach through it requires parameterizing the mode/context — the draft's P0-D1 covers this but must name the `mode:"food"` hard-coding as the specific thing to fix.

**E. Scope: two P0 items secretly need more than localStorage.**
- The **plain-language lint on `core-strings.ts`** and **axe CI** are fine on the prototype. But **"safety-critical keys have a hand-reviewed es value (not machine fallback)"** (P0-B2 AC) cannot be *proven* by a test at P0 — there is no review-provenance field in the codebase. A test can only assert the key exists and is non-empty and differs from en; true "human-reviewed" is a process gate (FR-12), not a unit test. The draft conflates them. **Fix:** P0 test asserts presence + non-machine-obvious placeholder; the human-review sign-off is an explicit release checklist item, not a green test.
- **Offline replay "idempotent because logDose de-dupes by med+date"** — verify: `logDose` case exists (`store.tsx:95`) but the de-dupe guarantee must be confirmed, not assumed. The draft asserts it; I flag it as **must-verify before relying on it for replay idempotency**.

**F. Sequencing honesty.** The draft's hard gate on `task_e569880c` is correct and well-stated. But it lists F9 (i18n) as "Not started / BLOCKING" while also making P0-B the critical path — consistent, good. The one dishonest note: P0-C is said to be parallelizable with P0-B "once types land," but P0-C4 (voice BP into `/numbers`) needs the es safety-banner strings from P0-B, so it's only partially parallel. Minor.

Everything else in the draft (offline outbox as a separate localStorage key, no-new-branch renderer principle, mock-only Coach at P0, `HEALTH_AI_VOICE_COACH_LIVE` kill-switch) is sound and preserved.

---

# Implementation Plan — Reaching the Unreached: Voice-First, Multilingual, Low-Literacy Access (FINAL)

**Spec:** `docs/specs/07-access-equity.md` · **Foundations:** `docs/plans/00-foundations.md`

## Foundations dependencies (delta only — do not re-derive)

- **F4 (Crisis gate + gate conventions) — HARD BLOCKING, and the shape is *in flux*.** Per F4, `task_e569880c` makes `crisis_escalate` the **literal first branch** of `decideSafety()`, adds a `CRISIS_ACTIONS` export, and widens `AiMessageAction` (expected `call_988`). **This plan must not assume the current `CARE_TEAM_ACTIONS` value or the current branch order (`safety-gate.ts:48–104`).** Voice renderers import the exported action constants; the parity test asserts tier order **by name**, not by line number. Do not start P0-C/P0-D voice work until `task_e569880c` merges and F4 is updated to as-built.
- **F9 (i18n generalization) — BLOCKING for P0.** Today `src/i18n/strings.ts` is Food-Lens-only (`FoodLensStringKey`, `foodLensStrings`, `t()`, parity test `strings.test.ts:20–26`). P0 lifts the key-union + parity pattern to core-loop surfaces and wires it to `npm run check`.
- **F2 (Demographics) — coordinate the one type change.** This feature widens `PatientProfile.language` from `"en"|"es"` to a named `Locale` and adds `preferredChannel`. Do it once with F2.
- **F3 (Audit actor) — co-migrate.** `AuditEvent` gains `channel`+`language` here; if F3 adds `actor`, widen `AuditEvent` and update `isAuditEvent` (`storage.ts:346–360`) + `recordAuditEvent` (`audit.ts`) in one pass.
- **F7 (Sensor hook) — reference only.** `useFoodCamera` lifecycle/stop-on-hidden is the template for the STT capture hook.
- **F8 (Return channel) / F1 (Backend) — P1 only.** `buildCareTeamMessage` locale extension and SMS/phone server store are out of P0.

---

## 1. Objective & P0 Definition of Done

**Thin shippable slice (P0):** On the existing localStorage prototype, **no backend**, a Spanish-speaking, low-literacy, or vision-impaired patient runs the safety-critical core loops entirely by voice, in Spanish, with the deterministic gate producing the **identical** decision it produces for typed input — including offline.

**P0 DoD — all must be true:**

1. **Voice BP logging with read-back (FR-1a, FR-3).** On `/numbers`, one large button; patient speaks "mi presión es 182 sobre 96"; `voice-parse` normalizes to `{182,96}` + the string `"182/96"`; value is read back ("182 sobre 96, ¿correcto?") and confirmed before it commits as a `HomeReading` with `captureChannel:"voice"`.
2. **Immediate safety alarm on parse, independent of read-back (FR-3).** The surface calls **`classifySafety(normalizedString)` directly** (a pure domain call, NOT the Coach `createSafeAiResponse` path) the instant a plausibly-dangerous value is parsed, and renders the in-language banner **before** confirmation. Read-back gates the *stored number*, never the alarm. A misheard-but-still-dangerous value never silences it.
3. **Voice dose logging (FR-1b).** On `/medicines`: "sí, la tomé" / "no, no la tomé"; if skipped, name a barrier by voice → `logDose` with `captureChannel:"voice"` and the parsed `barrier`.
4. **Spoken Coach — mock/Web-Speech path only (FR-6a).** Coach voice routes the transcript through `createSafeAiResponse()` via the mock provider (`mock-provider.ts` `openLiveSession`, parameterized off `mode:"food"`). **Live WebRTC Coach is out of P0** and blocked behind `HEALTH_AI_VOICE_COACH_LIVE` until FR-6a interception ships.
5. **Spanish on core-loop surfaces (FR-4).** Numbers, Medicines, Coach, Today static copy resolves through the generalized i18n layer keyed on `PatientProfile.language`; STT/TTS use the matching locale; no English-only dead-end on a core loop.
6. **In-language spoken safety banner at the gate's own urgency (FR-2, FR-6).** The banner/`content` the gate returns for a given input renders as large-type **and** in-language TTS. The renderer speaks **whatever tier the gate assigned** — it never re-derives or downgrades it. (We do **not** assert an absolute "SBP≥180 ⇒ hard-escalate" — see parity test below for the correct invariant.)
7. **Offline core loops (FR-7).** Network off: log a reading, log a dose, read the cached plan, hear the banner. `classifySafety()`/`decideSafety()` fire (pure functions over local state — verified). Reading/dose mutations queue in a separate outbox and replay once on reconnect.
8. **WCAG 2.1 AA + large-type on the four surfaces (FR-10).** Landmarks, labels, focus order, ≥4.5:1 contrast, ≥44px targets, TTS defers to an active screen reader. axe CI green on those surfaces.
9. **Plain-language lint (FR-5).** Flesch-Kincaid heuristic lints **static** `core-strings.ts` en strings; ≥95% at ≤6.0 grade; wired to `npm run check`.
10. **Audit (FR-13).** Every voice turn and locale change writes an `AuditEvent` with `channel`+`language`.
11. **Safety-parity suite green (RELEASE GATE).** See §7 for the exact — corrected — invariant.

**Not in P0:** SMS/phone, any backend, live WebRTC Coach, languages beyond en/es, full-app string extraction beyond the four surfaces, `buildCareTeamMessage` locale extension, Bluetooth device ingestion, provable "human-reviewed translation" as a *test* (it's a release-checklist gate, FR-12).

---

## 2. Prerequisites & Dependencies

| Dependency | Status (verified) | Blocking? |
|---|---|---|
| **F4 / `task_e569880c` merged + F4 updated to as-built** | In-flight; **no `988`/`crisis`/`CRISIS_ACTIONS` token exists in `src/` yet** | **BLOCKING.** Freeze the crisis action constants + branch order first. Consume, don't rebuild. |
| **F9 i18n generalization** | Not started; `strings.ts` Food-Lens-only | **BLOCKING for P0.** |
| `PatientProfile.language` → `Locale`; add `preferredChannel` | Not started; `types.ts:4–11`, `isPatient` `storage.ts:384–394` | Blocking for FR-4; coordinate with F2. |
| `recordAuditEvent` 4th optional `{channel,language}` arg | 3-arg today (`audit.ts:3–7`); **9 call sites in `store.tsx`** | Blocking for FR-13; back-compatible via optional arg. |
| Web Speech API | Browser built-in | Non-blocking; degrade to typed. |
| OpenAI Realtime key / `HEALTH_AI_PROVIDER` | Present, mock default | **Deferrable.** P0 = mock/Web-Speech only. |
| SMS/voice gateway + BAA + server store (F1) | None; only `realtime/token` + `food/lookup` routes | **P1.** |
| Per-language human reviewers (FR-12) | Process | Blocking for *release* of es safety strings; a checklist item, not a unit test. |

**Hard gate before any real-PHI use:** F1 backend + BAA + consent (all P1). P0 stays on-device, single-patient, synthetic-data pilot only.

---

## 3. Architecture & Approach

**Core principle (spec §3, F4):** the deterministic gate is the single source of truth. Each channel is a *renderer* of the gate's `banner`/`content`/`actions`. **No channel gets its own escalation logic, and no channel hard-codes the action constants** — import them from `safety-gate.ts`.

### New modules (under `src/`)

| Path | Responsibility |
|---|---|
| `src/domain/voice-parse.ts` | **Deterministic, no LLM.** `parseBpUtterance(text, locale): { systolic; diastolic; normalized: string } \| null` (normalized = the `"182/96"` form `classifySafety` already understands, so `safety.ts` stays English-pattern-only). `parseDoseUtterance(text, locale): { status; barrier } \| null`. Pure, unit-tested; this is what read-back confirms and what the immediate alarm classifies. |
| `src/hooks/use-speech-capture.ts` | Web Speech `SpeechRecognition` with the `useFoodCamera` lifecycle (start/stop, stop-on-`visibilitychange`/`pagehide`, permission-denied, `supported=false` degrade-to-typed). Returns `{ transcript, listening, start, stop, supported }`. |
| `src/hooks/use-voice-session.ts` | Generalization of `use-food-voice-session.ts`. Same handle contract + `reduceRealtimeEvent` (already surface-agnostic — lift as-is). **Inject** `buildInstructions(state)` and `getContext(): LiveSessionContext`; refuse `mode:"live"` for the Coach surface unless `HEALTH_AI_VOICE_COACH_LIVE` is true (FR-6a kill-switch). |
| `src/components/voice-capture-button.tsx` | One ≥44px "Hablar / Speak" button + read-back confirm UI; large-type parsed value; a11y-labeled; TTS defers to active screen reader. |
| `src/i18n/keys.ts` + `src/i18n/core-strings.ts` | `CoreStringKey` union + `en`/`es` maps for Today/Numbers/Medicines/Coach. Add `tc(locale, key, vars)` (parallel to `t()`); missing-locale falls back to `en`, never crashes. Safety-critical subset tagged (see P0-B2). |
| `src/domain/reading-level.ts` | `fleschKincaidGrade(text): number` — arithmetic, no model. |
| `scripts/lint-reading-level.ts` | Scores every `core-strings.ts` en string; fails if >5% exceed grade 6.0. Wired to `check`. |
| `src/state/offline-queue.ts` | Outbox in a **separate** localStorage key (`home-health-ai-outbox`); serializes pending `addReading`/`logDose`; replays on `online`. Never mixed into `STORAGE_KEY`. |

### Existing modules to extend (verified symbols)

- **`src/domain/safety.ts` — `classifySafety()`:** unchanged; stays English-pattern-only. `voice-parse` normalizes es→`"182/96"` upstream so `safety.ts` never learns Spanish. **Decision preserved.**
- **`src/ai/safety-gate.ts` — `createSafeAiResponse()`/`decideSafety()`:** logic unchanged. Voice/SMS transcripts enter as `request.patientInput` exactly like typed text. **Import (do not inline) `CARE_TEAM_ACTIONS` and — once `task_e569880c` lands — `CRISIS_ACTIONS`.**
- **`src/ai/realtime-session.ts`:** `reduceRealtimeEvent` lifts as-is. `injectContext()` is food-coupled via `context.identifiedFood`/`flagTexts` (`134–151`) — **parameterize** the context builder so Coach passes its own context text. `ConnectArgs.language` already `"en"|"es"` — widen to `Locale`.
- **`src/ai/mock-provider.ts` — `openLiveSession` (`:115`):** hard-codes `mode:"food"` and reads `context.identifiedFood`/`frameDataUrl`. **Parameterize the mode + context** so Coach voice routes through `createSafeAiResponse()` deterministically.
- **`src/ai/food-instructions.ts` / `src/ai/prompts.ts`:** add the plain-language + target-language directive to the **same** `healthAiSystemPrompt` string; add `buildCoachInstructions(state)` modeled on `buildFoodLensInstructions`.
- **`src/domain/types.ts`:** widen `language`; add `preferredChannel`, `captureChannel`, `AuditEvent.channel`/`.language`, `AiMessage.channel` (§5).
- **`src/domain/audit.ts` — `recordAuditEvent`:** add optional 4th arg `{channel?, language?}`; thread through the **9 call sites** in `store.tsx`.
- **`src/state/store.tsx` — `healthReducer`:** add `setLocale`; thread `captureChannel` through existing `addReading`/`logDose` payloads (§5 decision — no separate voice actions).
- **`src/state/storage.ts`:** widen `isReading`/`isDoseEvent`/`isAuditEvent`/`isPatient` to accept the optional new fields; back-fill `preferredChannel:"app"` in `loadStoredState` mirroring the `mealLog`/`doseEvents === undefined` pattern (`484–489`) so legacy blobs survive.
- **`src/i18n/strings.test.ts`:** generalized parity test also asserts `core-strings.ts` key parity.

### Data flow — Flow 1 (voice BP, dangerous value)
```
speak (es) → use-speech-capture (es-ES) → transcript
  → voice-parse.parseBpUtterance → {182,96, normalized:"182/96"}
  → [IMMEDIATE] classifySafety("182/96")  ← direct pure call, NOT createSafeAiResponse
       → level "escalate" → render in-language banner NOW (large-type + es TTS)   ← FR-3 alarm ungated
  → read-back "182 sobre 96, ¿correcto?" → confirm
  → dispatch(addReading {..., captureChannel:"voice"})   ← commits value; audit channel:"voice", language:"es"
  → offline? enqueue in outbox; alarm already fired (pure fn, no network)
```
### Data flow — Flow 3 (voice Coach, mock)
```
speak (es) → use-voice-session (mock, openLiveSession w/ mode:"ask" + coach context)
  → transcript → createSafeAiResponse({patientInput:transcript, mode, state}, mockProvider)
       → decideSafety(): hard-escalate ⇒ content is deterministic, provider never called
                         soft-block (med change) ⇒ answer + banner + draft_message
                         allowed ⇒ mock templated answer
  → speak(content/banner) es TTS + large-type; dispatch(addAiMessage {..., channel:"voice"})
```

---

## 4. Work Breakdown (sequenced)

### P0-A — Foundations wiring
- [ ] **P0-A1** — Widen `PatientProfile.language` to named `Locale` (`"en"|"es"`, extend-ready). Files: `types.ts`, `i18n/strings.ts` (`Language`). AC: compiles; adding a locale is a one-line union edit.
- [ ] **P0-A2** — Add `preferredChannel:"app"|"sms"|"phone"` (P0 default `"app"`) to `PatientProfile`; `captureChannel?:Channel` to `HomeReading`+`DoseEvent`; `channel?`/`language?` to `AuditEvent`; `channel?` to `AiMessage`. Keep new reading/dose/audit fields **optional**. Files: `types.ts`. AC: existing fixtures typecheck unchanged.
- [ ] **P0-A3** — Widen storage guards + back-fill. Files: `storage.ts` (`isReading`,`isDoseEvent`,`isAuditEvent` accept optional new fields; `isPatient` back-fills `preferredChannel:"app"` in `loadStoredState` per `484–489`). AC: **a legacy blob with no channel fields loads intact, not wiped to `demoState`**; storage tests green.
- [ ] **P0-A4** — `recordAuditEvent` optional 4th arg `{channel?,language?}`; thread through the 9 `store.tsx` call sites; default `channel:"app"`, `language:patient.language`. Files: `audit.ts`, `store.tsx`, `fixtures.ts`. AC: existing call sites compile unchanged (optional arg).

### P0-B — i18n generalization (FR-4, FR-5)
- [ ] **P0-B1** — `CoreStringKey` + `en`/`es` maps for the four surfaces; add `tc()`. Files: create `i18n/keys.ts`,`i18n/core-strings.ts`; modify `i18n/strings.ts`. AC: every hardcoded English string on the four pages has a key; missing-locale falls back to `en`.
- [ ] **P0-B2** — Tag the **safety-critical subset** (escalation banners per urgency, med-change refusal, "get help now", and — from F4 — crisis/988 labels) with `safetyCritical:true`; export `getSafetyCriticalKeys()`. AC: returns the finite list; a test asserts each has a **non-empty es value that differs from en and is not a `[[MT]]` placeholder**. (True human-review is a release checklist item, FR-12 — not provable by this test.)
- [ ] **P0-B3** — Extend locale-parity test to `core-strings.ts`. Files: `strings.test.ts`. AC: fails if any `CoreStringKey` missing from `es`; runs under `npm run test`.
- [ ] **P0-B4** — Reading-level scorer + lint script wired to `check`. Files: `domain/reading-level.ts`, `scripts/lint-reading-level.ts`, `package.json`. AC: fails if >5% of en core strings exceed grade 6.0; scorer unit-tested.
- [ ] **P0-B5** — Refactor the four pages (+ `bp-log-form`, `dose-card`) to `tc(language, key)`. Files: `app/numbers/page.tsx`,`app/medicines/page.tsx`,`app/chat/page.tsx`,`app/today/page.tsx` + components. AC: setting `language:"es"` renders those surfaces in Spanish end-to-end (Playwright asserts a known es string).

### P0-C — Voice input & deterministic parse (FR-1, FR-3)
- [ ] **P0-C1** — `voice-parse.ts` (BP+dose+barrier, en+es), returns `normalized`. Files: create. AC: "182 sobre 96"→{182,96,"182/96"}; "sí la tomé"→taken; "no, por el costo"→{skipped,cost}; ambiguous→`null`.
- [ ] **P0-C2** — `use-speech-capture.ts` (locale from `patient.language`; stop-on-hidden; `supported=false` degrade). Files: create. AC: graceful where API absent; stops on `visibilitychange`/`pagehide`.
- [ ] **P0-C3** — `voice-capture-button.tsx` + read-back confirm. Files: create. AC: ≥44px; parsed value large-type + spoken; explicit confirm/correct; a11y-labeled; TTS defers to screen reader.
- [ ] **P0-C4** — Wire voice BP into `/numbers` with **immediate `classifySafety(normalized)` alarm pre-confirmation** (FR-3). Files: `app/numbers/page.tsx`; import `classifySafety` from `domain/safety`. AC: dangerous parse surfaces the in-language banner **before** confirm; confirm commits `addReading{captureChannel:"voice"}`; misheard-but-dangerous never silences the alarm. **The alarm is a direct pure call, not the Coach gate path.**
- [ ] **P0-C5** — Wire voice dose into `/medicines`. Files: `app/medicines/page.tsx`,`components/dose-card.tsx`. AC: "no, por el costo"→`logDose{status:"skipped",barrier:"cost",captureChannel:"voice"}`; barrier propagates to `activeBarriers`.

### P0-D — Spoken Coach (gated, mock path only) (FR-2, FR-6, FR-6a)
- [ ] **P0-D1** — Generalize `use-food-voice-session.ts`→`use-voice-session.ts`; parameterize `mock-provider.openLiveSession` off `mode:"food"` and the food-coupled context. Files: create hook; modify `mock-provider.ts`, `realtime-session.ts` (context param, `Locale`), `ai/types.ts` (`LiveSessionContext` → `{ contextText:string; frameDataUrl?:string; identifiedFood?:... }`). AC: **Food Lens still works through the generalized hook (regression)**; Coach supplies its own instructions/context.
- [ ] **P0-D2** — `buildCoachInstructions(state)` + append plain-language/target-language directive to `healthAiSystemPrompt`. Files: `ai/coach-instructions.ts`, `ai/prompts.ts`. AC: ~6th-grade, speak in `patient.language`, never diagnose/prescribe.
- [ ] **P0-D3** — **FR-6a guard.** Coach voice routes transcript through `createSafeAiResponse()` (mock); **block live WebRTC for Coach unless `HEALTH_AI_VOICE_COACH_LIVE` is true** (default off). Files: `app/chat/page.tsx`, guard in `use-voice-session.ts`. AC: with `HEALTH_AI_PROVIDER=openai`, Coach voice still uses the gated path, never direct browser↔OpenAI symptom streaming; a test asserts a hard-escalate utterance suppresses the model answer and speaks the deterministic banner.
- [ ] **P0-D4** — In-language TTS of gate `banner`/`content`; `addAiMessage{channel:"voice"}`. Files: `app/chat/page.tsx`. AC: med-change utterance → soft-block refusal + `draft_message` spoken in es; audit + `aiMessages` capture the turn. (Renderer speaks the tier the gate assigned; it does not assert a tier.)

### P0-E — Offline (FR-7) & Accessibility (FR-10)
- [ ] **P0-E1** — `offline-queue.ts` outbox; enqueue `addReading`/`logDose` when `!navigator.onLine`; replay on `online`. Files: create; wire in `store.tsx`. AC: offline log reading+dose persist locally; on reconnect replay **once**. **Prereq: verify `logDose` de-dupes by med+date (confirm in `store.tsx:95` case) before relying on it for idempotency; if it does not, the outbox must de-dupe.**
- [ ] **P0-E2** — Explicit offline safety test. Files: test only. AC: `decideSafety`/`classifySafety` on a dangerous value with network mocked off → banner fires.
- [ ] **P0-E3** — a11y pass on the four surfaces + large-type toggle. Files: four pages + `app-shell.tsx`. AC: landmarks/labels/focus-order; ≥4.5:1; ≥44px; TTS defers when a screen reader is active.
- [ ] **P0-E4** — axe CI on the four surfaces. Files: Playwright + `@axe-core/playwright`; wire to `test:e2e`. AC: 0 critical violations on Today/Numbers/Medicines/Coach.

### P0-F — Safety-parity release gate
- [ ] **P0-F1** — Cross-channel parity suite (**RELEASE GATE**). File: `src/ai/safety-gate.parity.test.ts`. AC — the **corrected** invariant (§7): for a matrix of inputs, `decideSafety` yields the **identical** `kind`/`safety`/`actions` whether the text arrived typed or as a voice transcript; hard-escalate never calls the provider; **tier ordering is asserted by name** (crisis → hard-escalate → soft-escalate → soft-block → allowed) and a lower-tier co-signal cannot pre-empt a higher one; **action constants are imported, not literals.** 100% pass blocks release.

---

## 5. Data Model & Storage Changes

```ts
export type Locale = "en" | "es";                 // widen-ready
export type Channel = "app" | "voice" | "sms" | "phone";

PatientProfile.language: Locale                    // was "en" | "es"
PatientProfile.preferredChannel: "app"|"sms"|"phone"  // NEW, P0 default "app"
HomeReading.captureChannel?: Channel               // NEW, default "app"
DoseEvent.captureChannel?: Channel                 // NEW, default "app"
AiMessage.channel?: Channel                        // NEW
AuditEvent.channel?: Channel                       // NEW
AuditEvent.language?: Locale                       // NEW
```
New reading/dose/audit/message fields are **optional** so fixtures and persisted state stay valid without a hard migration.

**Reducer:** add `{ type:"setLocale"; language:Locale }` (updates `patient.language`, audits `"updated"` with `language`). **Decision:** do **not** add `addReadingByVoice`/`logDoseByVoice`; thread `captureChannel` through the existing `addReading`/`logDose` payloads (one action per mutation, one audit path). Spec §3 named `logDoseByVoice` illustratively; the leaner design is preserved.

**Storage:** `isReading`/`isDoseEvent` validate `captureChannel` only if present; `isAuditEvent` validates `channel`/`language` only if present; `isPatient` **back-fills** `preferredChannel:"app"` in `loadStoredState` (never hard-require it — that would wipe legacy blobs to `demoState`). Add explicit "legacy blob loads intact" tests. **Offline outbox** lives in its own key `home-health-ai-outbox`, never mixed into `STORAGE_KEY`.

---

## 6. AI / Model Wiring

- **Deterministic, NEVER an LLM (load-bearing):** `classifySafety()`/`decideSafety()`/`hasDangerousBloodPressure()` (regex+thresholds); `voice-parse.ts` (regex over transcripts — STT is the model, *parsing its output is deterministic* so read-back has a fixed target); `reading-level.ts` (arithmetic).
- **Gate flow:** every voice/SMS transcript enters as `request.patientInput` through the **unchanged** `createSafeAiResponse()`. Hard-escalate ⇒ deterministic `content`, provider never called (`safety-gate.ts:115–122`). Soft cases ⇒ provider answers, decision → `banner` (`132–140`). The renderer consumes `content`/`banner`/`actions`; **it never re-derives or downgrades them, and imports the action constants.**
- **Immediate FR-3 alarm is a *separate*, direct `classifySafety()` call** on the parsed/normalized string at the numbers surface — decoupled from the Coach gate path.
- **Realtime voice — P0-GATED:** live WebRTC Coach is **not** released (FR-6a); the mock/Web-Speech path (`mock-provider.openLiveSession`, parameterized off `mode:"food"`) is released because it routes deterministically through `createSafeAiResponse()`.
- **Haiku (P1 mostly):** static-string translation drafts (human-reviewed for the safety-critical subset before ship), plain-language rewriting, SMS quick-reply parsing (P1). **Sonnet (P1):** care-team draft, Health Brief, nuanced Coach.

---

## 7. Testing Strategy

**Vitest — deterministic/safety (must stay green):**
- `src/domain/safety.test.ts` (existing) — regression guard on the gate; unchanged.
- **`src/ai/safety-gate.parity.test.ts` (NEW, RELEASE GATE)** — the corrected invariant:
  - For each input in the matrix (dangerous vital in note/free-text, urgent-symptom phrase, at-threshold reading, med-change, benign), assert `decideSafety`/`createSafeAiResponse` return the **same** `kind`/`safety`/`actions` for **typed vs. voice-transcript** delivery of the *same* string. **This is channel-invariance, not an absolute tier.**
  - Assert hard-escalate paths **never call the provider** (spy asserts 0 calls).
  - Assert **tier order by name** — crisis (once `task_e569880c` lands) > hard-escalate > soft-escalate > soft-block > allowed — via a co-occurring-signal case (e.g., a dangerous-vital note plus a med-change phrase resolves to the higher tier). **Do not pin `safety-gate.ts:48–104` line order.**
  - Assert actions come from the **imported constants** (`CARE_TEAM_ACTIONS`, later `CRISIS_ACTIONS`), not string literals — so the test survives F4's widening.
- `src/domain/voice-parse.test.ts` (NEW) — en+es BP/dose/barrier; ambiguous→null; **es "182 sobre 96" normalizes to `"182/96"`** so `safety.ts` stays English-only.
- `src/domain/reading-level.test.ts` (NEW) — FK scorer sanity.
- `src/i18n/strings.test.ts` (extended) — core-strings parity; safety-critical keys have non-empty es values distinct from en and not a `[[MT]]` placeholder.
- `src/state/storage.test.ts` (extended) — **legacy blob (no channel fields) loads without reset**; `preferredChannel` back-fill correct.

**Named safety-regression tests that must be green:**
- **FR-3 pre-confirmation alarm** (component/integration): a dangerous parse surfaces the banner **before** read-back confirmation, via the direct `classifySafety` call.
- **Channel parity on a dangerous free-text vital** ("182 over 96" vs. es-normalized "182/96"): identical `decideSafety` outcome; provider not consulted on hard-escalate.
- **Med-change utterance** → soft-block + `draft_message`, en and es (via normalized/typed path).
- **FR-6a**: a hard-escalate voice utterance on Coach suppresses any model answer and speaks the deterministic banner.

**Playwright e2e:** `voice-bp-es.spec.ts` (es alarm pre-confirmation, then commit), `voice-dose.spec.ts` (skip w/ cost barrier), `coach-voice-gated.spec.ts` (hard-escalate suppresses model), `offline-core-loop.spec.ts` (offline log + banner + single replay), `a11y-core-surfaces.spec.ts` (axe, 0 critical), `es-core-surfaces.spec.ts` (known es strings on the four surfaces).

---

## 8. Rollout, Flags & Verification

**Env toggles (env-only, no flag framework):**
- `HEALTH_AI_PROVIDER=mock` (P0 default) — ships the gated Web-Speech Coach.
- `HEALTH_AI_PROVIDER=openai` — enables live realtime **for Food Lens**; Coach voice stays gated.
- **`HEALTH_AI_VOICE_COACH_LIVE`** (NEW, default unset/false) — the FR-6a kill-switch. Live WebRTC Coach is reachable **only** when this is true **and** transcript interception has shipped. Off at P0. Document in README.

**Demo/verify P0 (localStorage, no backend):**
1. `npm run dev`, `/numbers`, set `language:"es"` (fixtures/dev toggle).
2. "Hablar" → "mi presión es 182 sobre 96" → es banner appears + spoken **before** confirm; confirm → reading commits; audit shows `channel:"voice", language:"es"`.
3. `/medicines` → skip a dose by voice with cost barrier → barrier in `activeBarriers`.
4. `/chat` → med-change question by voice → soft-block refusal + `draft_message`, spoken es.
5. DevTools offline → log a reading → banner still fires; online → mutation replays once.
6. Screen reader on Today → TTS defers; tasks labeled + focus-ordered.
7. `npm run check` (lint + tests + build) + reading-level lint + parity suite + axe all green.

**Gate before real-PHI:** blocked until P1 (F1 backend + BAA + SMS consent + content-minimization). P0 is synthetic-data / on-device pilot only.

---

## 9. Risks, Open Questions & Decisions

1. **FR-6a live-voice gate (highest severity).** Until transcript-classify-then-suppress (i) or route-through-server (ii) ships, live WebRTC Coach is **not releasable**. P0 sidesteps via mock-only. Eng picks (i)/(ii), then clinical sign-off.
2. **Corrected escalation-tier fidelity.** "SBP≥180 ⇒ hard-escalate" is **not** universally true in the current gate (care-plan threshold routes a stored high reading to `soft_escalate` first). The renderer speaks whatever tier the gate assigns; the parity test asserts channel-invariance, not an absolute tier. Any product copy promising "always emergency framing for ≥180" must be reconciled with the gate — clinical decision.
3. **`task_e569880c` shape freeze.** Do not start P0-C/D until F4 is updated to the as-built crisis action constant name, branch order, and realtime gating. Consume the exported constants; never rebuild.
4. **Emergency-number localization.** Gate says "seek urgent help now," not "call 911." Should US-locale hard escalations name 911, and how is the string localized/reviewed per region? Per-locale FR-12 entry; clinical+legal sign-off.
5. **"Safety-critical" translation boundary.** Eng can enumerate the *keys* (P0-B2); the *clinical boundary* and human-review sign-off are process gates, not unit tests.
6. **STT accuracy for accented es / long-tail languages.** Read-back bounds the numeric case; free-text symptom capture is riskier — hard dependency before any language past es. Always offer a typed fallback (no voice-only dead-end).
7. **Migration safety.** Widening `PatientProfile` risks wiping legacy localStorage to `demoState` if `isPatient` over-tightens. P0-A3 + "legacy blob loads intact" tests must prove survival.
8. **Replay idempotency.** Confirm `logDose` de-dupes by med+date before relying on it; otherwise the outbox de-dupes.

---

## 10. Effort & Sequencing

| Milestone | T-shirt | Notes |
|---|---|---|
| P0-A Foundations wiring | S–M | Type widening + guards + back-fill + audit 4th-arg threading (9 call sites). Coordinate F2/F3. |
| P0-B i18n generalization | M | The real hidden cost (F9). 4-surface extraction + parity + reading-level lint. |
| P0-C Voice input & parse | M | `voice-parse` small but test-heavy; capture hook + read-back UI is the bulk. |
| P0-D Spoken Coach (gated) | M | Generalizing the hook + parameterizing `openLiveSession` off `mode:"food"`; Food Lens regression risk. |
| P0-E Offline + a11y | M | Outbox small; a11y + axe steady across 4 surfaces. |
| P0-F Safety-parity gate | S | Small but non-negotiable; author early against the **corrected** invariant. |

**Build order:** P0-A → P0-B (partially parallel with P0-C; P0-C4 needs P0-B es banner strings) → P0-C → P0-D → P0-E → **P0-F authored as soon as P0-A lands, run continuously.**

**Hard gates:** (1) no P0-C/D until `task_e569880c` merges and F4 is updated to as-built; (2) `HEALTH_AI_VOICE_COACH_LIVE` stays off until FR-6a interception ships and P0-F is green; (3) no P1 (SMS/backend/PHI) until F1 + BAA + consent exist.

---

**What you need to do (developer picking this up):**
1. Confirm `task_e569880c` merged; read the as-built `safety-gate.ts` for the **new** crisis action constant name and branch order; update F4 in `docs/plans/00-foundations.md` to as-built **before** touching voice.
2. Coordinate `PatientProfile` widening (P0-A1/A2) + `recordAuditEvent` 4th-arg + storage back-fill with F2/F3 so the shared types change once.
3. Author `safety-gate.parity.test.ts` (P0-F1) against the **channel-invariance** invariant (not an absolute tier), importing action constants — never hard-code `["call_clinic","draft_message"]` or the current branch line order.
4. Keep `HEALTH_AI_VOICE_COACH_LIVE` off; ship the mock/Web-Speech Coach only.
5. Verify `logDose` de-dupes by med+date before wiring outbox replay.

**Plain-English summary:** This P0 ships the whole voice-first, Spanish, accessible experience on the existing localStorage app with no backend — patients log BP and doses and ask the Coach by voice, hear safety warnings in Spanish, and it all works offline — by making every new channel a new *renderer* of the one deterministic safety decision. The corrected version fixes two false safety assumptions in the draft (an absolute "SBP≥180 is always an emergency" tier, and a parity test pinned to the current gate's line-by-line branch order that `task_e569880c` is about to change) and points the immediate BP alarm at a direct pure `classifySafety` call rather than the Coach's answer path.
