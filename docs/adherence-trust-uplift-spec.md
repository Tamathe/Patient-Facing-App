# Adherence & Trust Uplift — Implementation Spec

**Status:** Retired — superseded and rescoped 2026-07-20
**Author:** Product (from the "Jordan Taylor" usability walkthrough + code-grounded audit)
**Date:** 2026-07-05
**Scope:** Historical product research; not an executable current specification

> Later sprints delivered overlapping adherence, accessibility, diabetes, safety, and privacy work against newer contracts. Preserve the findings below as research, but start new work only from the three bounded candidates in the [retired execution plan](adherence-trust-uplift-execution-plan.md): adherence/barrier UX, dose reminders/PWA, or mode-aware privacy disclosure.

---

## 1. Why we're doing this

We walked the app as **Jordan Taylor, 55**: diagnosed with high blood pressure a year ago, *feels completely fine* (so he quietly doubts he needs a daily pill), takes **Lisinopril 10 mg once daily**, **misses weekend doses**, and secretly suspects his **dry cough + lightheadedness** are the drug — but has told no one. He worries about **cost** and whether the pill is **working**, wears **reading glasses**, is **not a power user**, is **jargon-averse**, has a **clinic visit in 2 weeks**, and is **wary that an "AI" app ships his medical data somewhere.**

**Jordan's single goal — and therefore ours:** *actually take the pill consistently and feel confident it's worth it.*

The app is already unusually kind and safe (blame-free logging, a real Coach safety gate, a useful visit brief, an on-device privacy model). This spec **keeps all of that** and fixes the gaps that block Jordan's goal. The biggest: **nothing ever reminds him to take the pill**, and at his two moments of peak doubt ("is it working?" / "why bother if I feel fine?") the app shows him nothing or reads his medicine label back at him.

### Product guardrails (do not violate)
- The app **does not diagnose, prescribe, or change doses.** Every new Coach/answer string must be free of dosing instructions. The safety gate runs **before** the provider and must keep blocking dose-change requests.
- **On-device by default.** No new data leaves the device in the default (mock) build. The only network path is the optional OpenAI live-voice mode, which must be **honestly disclosed** (Workstream G).
- **Plain language, big enough to read.** No `systolic`/`diastolic`/`mmHg`/`call threshold`/raw enums on any patient- or clinician-facing surface.

---

## 2. Goals / non-goals

**Goals**
1. Bring Jordan back to the app to take the pill (reminders he doesn't have to remember).
2. Make the pill's value **visible from day one** ("is it working?" early + honest adherence rate).
3. Make every confession (skip, side effect, cost, ran-out) **lead to a concrete next step.**
4. Give the Coach **real answers** to his three real questions while staying safe.
5. Speak plainly and be **legible for 55+.**
6. Keep his **trust**: honest, mode-aware privacy disclosure.

**Non-goals (this spec)**
- Server-side push notifications / VAPID (background push is out of scope; the reliable path is an in-app Today nudge — see Workstream A).
- Structured medication-schedule parsing (dose time defaults from a constant, editable by the user).
- Real EHR integration or clinician-side workflow.
- Rewriting the Food Lens.

---

## 3. Scope at a glance (29 findings → 7 workstreams)

| # | Workstream | Findings | Headline change | Impact × Effort |
|---|-----------|----------|-----------------|-----------------|
| A | **Reminders & one-place daily loop** | adh-no-reminder, eb-6 | Opt-in, weekend-aware daily dose reminder (PWA + in-app fallback); inline "Log today's BP" on Today | **High × M** |
| B | **Prove it's working** | adh-reassurance-hidden-early/eb-4, adh-rate-never-shown, adh-weekend-streak-punish, adh-brief-omits-dose-history | Graded early trend, plain adherence rate, weekend-aware streak, dose history in the visit brief | **High × S–M** |
| C | **Barriers lead somewhere** | adh-trouble-mode-noop, adh-barrier-deadend, adh-feel-fine-skip-no-followup, eb-5 | Barrier-aware "trouble" answers, refill/cost paths, point-of-skip response, prioritized barrier grid | **High × S–M** |
| D | **Coach that answers & stays safe** | why-canned, cough-escalation-gap, regex-gaps, generic-draft, escalate/blocked wording | Real "why", first-time symptom escalation, harder guardrails, context-aware draft, plain safety copy | **High × S–M** |
| E | **Plain language & the Health Brief** | call-threshold/mmHg, raw-enum-in-brief, raw-status-tags, raw-numbers, plan-EHR-language | "Your call-your-team number is 160 on top / 100 on the bottom", friendly labels, per-reading meaning, partner language + a "why this matters" goals section | **High × S** |
| F | **Accessibility 55+ & lower effort** | font-scale, 9-tiny-nav, muted-contrast, tiny-checkboxes, focus-states, mandatory-context, prefill/steppers, intake-friction | Larger type, 5-tile nav + More, AA contrast, focus rings, one-tap-fast logging | **High/Med × S–M** |
| G | **Honest AI privacy disclosure** | privacy-promise-false-when-ai-enabled | Mode-aware privacy promise + in-UI live-voice disclosure + confirm-delete (EN+ES) | **High × M** |

*(Full per-finding evidence with `file:line` lives in the audit output; every finding here was adversarially verified against the code — none is already implemented.)*

---

## 4. Architecture decisions

### 4.1 Reminders = PWA notification **+** guaranteed in-app fallback
`Medication.schedule` is free text (`"Once daily"`) and **not machine-parseable**, so the dose time defaults from a **constant** (editable by the user), not by parsing the schedule.

- **Preference** persisted in app state (`AppState.doseReminder`), migrated on load exactly like `mealLog`/`doseEvents`.
- **Delivery:** opt-in `Notification` permission → a service worker (`public/sw.js`) that does **no offline caching** (only `notificationclick` routing + `showNotification`). Background push (server/VAPID) is **out of scope**.
- **Fallback (the reliable path):** a pure `isReminderDueNow(pref, todayDose, now)` drives an **in-app nudge banner on Today** whenever the reminder is due and today's dose isn't logged yet — so the loop closes even when OS notifications are denied/unsupported. Default user is **opted out** (`enabled: false`); Today is unchanged until they opt in.
- **Weekend-aware:** separate `weekdayTime` (default `08:00`) and `weekendTime` (default `10:00`), because Jordan sleeps in and misses Sat/Sun.

### 4.2 Adherence math becomes weekend-aware and non-punitive
The all-or-nothing streak that zeroes on a Sat/Sun gap is replaced/augmented by **scheduled-day** logic and a **rate over a window**, so a predictable weekend gap doesn't read as failure. `getAdherenceRate` already exists and is tested — it's just never shown; we surface it.

### 4.3 Coach deep-links carry intent
Skip reasons and barriers deep-link the Coach with a preselected mode: `/chat?mode=why` (for "doesn't feel necessary") and `/chat?mode=trouble` (for side effects / cost / ran-out). The Coach reads `?mode=` (validated against the `AiMode` union, invalid → `explain`), wrapped in `<Suspense>`.

### 4.4 Privacy copy is display-time and mode-aware
No data-model change. The privacy panel learns the active voice mode (`mock` vs `live`) by resolving `/api/realtime/token` and renders a **mode-aware promise** + an in-UI **live-voice disclosure**, in EN **and** ES.

---

## 5. Phased delivery plan

Phases are **dependency-ordered** and deliberately **land each shared file once, then only add.** Each phase gate is `npm run check` green (lint + full vitest + `next build`) **plus** the specifics below. Re-run the **full** vitest suite at every gate (several test files are edited across phases).

### Phase 1 — Plain language + high-leverage adherence proof *(no data-model change → zero migration risk)*
**Workstreams E + B.** Presentational + pure-domain additions only.
- **E:** `blood-pressure.ts` call_clinic rewrite → top/bottom wording; `health-brief.ts` jargon fixes (`barrierLabel`, top/bottom, per-reading `interpretBloodPressure` tags, section retitles); `health-brief-card.tsx` route status through `evidenceStatusLabel`; `numbers/page.tsx` per-reading meaning + contrast; `plan/page.tsx` partner language **+ surface the care-plan goals/reasons** so "why the pill matters even when you feel fine" is finally visible.
- **B:** `adherence.ts` new exports (`summarizeBpTrendState`, `getScheduledAdherenceStreak`, `getScheduledAdherence`, `BpTrendState`); `fixtures.ts` demoState → **6 descending readings** + weekday `doseEvents`; `dose-card.tsx` `trendState`+`rate`+weekend copy (this **establishes the final `DoseCardProps` shape**); `today/page.tsx` adherence import swap; `health-brief.ts` "Recent doses" line.

**Gate:** grep confirms **no** patient surface renders `call threshold` / `systolic` / `diastolic` / `mmHg` / raw barrier enum / underscored status; all 6 `dose-card.test.tsx` renders migrated (`trend`→`trendState`, add `rate`) + progress test; the 5 `safety-gate.test.ts` banner assertions + 1 `conversation-panel` fixture read `call-your-team number`; `health-brief.test.ts` finds `Medicines and what gets in the way` + `Recent doses`; `care-team-message.test.ts` asserts `132/84`.

### Phase 2 — Coach that answers & stays safe
**Workstream D.** `mock-provider.ts` `buildWhyAnswer` rewrite + `export ACE_ARB_NAMES`; `safety-gate.ts` first-time no-barrier soft-escalate (ACE-aware) + optional `suggestBarrier` on `HealthAiResponse`; `safety.ts` colloquial dose-change patterns; `care-team-message.ts` optional `concern` param; `conversation-panel.tsx` reword safety copy + drop the always-on "Safety guidance:" allowed chip; `chat/page.tsx` thread latest patient input + symptom into the draft.

**Depends on Phase 1** (why-answer reuses trend/streak helpers + the ≥5-reading improving demo).
**Gate:** pre-logged `side_effects` still **hard**-escalates; `chest pain` hard-escalates first; the 6 colloquial dose-change phrases block while bare *"do I even need this?"* / *"why am I taking lisinopril?"* stay allowed; new escalate/blocked copy shows and the allowed chip is gone; grep new copy for imperative `stop`/`increase`/`every other day` → none.

### Phase 3 — Barriers lead somewhere + deep-link plumbing
**Workstream C.** `mock-provider.ts` `buildTroubleAnswer` (not-worth-it sub-intent **calls Phase-2 `buildWhyAnswer`**); `tasks.ts` barrier-specific tasks with `?mode=` deep links; `dose-card.tsx` primary/More barrier split + point-of-skip reassurance + mode-scoped help link + optional `reassurance` prop; `today/page.tsx` pass `reassurance`; `conversation-panel.tsx` `initialMode` prop; `chat/page.tsx` `<Suspense>` + `?mode=` (merged with Phase-2 draft threading).

**Depends on Phases 1–2.**
**Gate:** trouble handler returns routed non-filler for cough/cost/ran-out/not-worth-it/fallback; safety gate **still fires first** for dose-change; DoseCard shows 3 primary + More expander with mode-scoped help links and unchanged accessible name (`Get help with this`); `/chat?mode=trouble` preselects the Trouble chip; invalid `?mode=` falls back to `explain` without crashing; exactly one medicine task emitted with correct barrier copy.

### Phase 4 — Accessibility 55+ & lower daily effort
**Workstream F.** `globals.css` `html { font-size: 112.5% }` + global `:focus-visible` + `--care` var; `app-shell.tsx` 4-primary + **More** nav; `bp-log-form.tsx` clock-default context + steppers + per-field errors + enlarged radios; `numbers/page.tsx` prefill last reading + contrast; `intake/page.tsx` require-only-pasted-text + inline error + auto-title; contrast/`text-xs`→`text-sm` sweep across cards.

**Runs after content phases** so the presentational sweep lands on **final copy** (frozen by Phases 1–3).
**Gate:** bottom nav shows exactly 5 tiles (Today / My Numbers / My Medicines / Coach / More), More exposes the secondary links + Add; `:focus-visible` ring visible on tab; no informational text at `text-xs` or `text-ink/60|65`; BP saves with **no chip tapped** (clock default) and steppers clamp to schema ranges; Intake saves with only pasted text and shows a real inline error under 10 chars.

### Phase 5 — Reminders / PWA flagship *(only phase with a schema change)*
**Workstream A.** `types.ts` `DoseReminderPreference` + `ReminderPermission` + `AppState.doseReminder`; `domain/reminders.ts` (pure); `fixtures.ts` **append** `doseReminder` (both states, after the Phase-1-mutated arrays); `store.tsx` `setDoseReminder` action + audit; `storage.ts` guard + migration + non-destructive sanitize; `use-dose-reminder.ts` hook; `reminder-optin.tsx`; `sw-register.tsx`; `today/page.tsx` in-app nudge + `ReminderOptin` (eb-6 Log-BP link already added in Phase 1); `layout.tsx` `Metadata.manifest` + `Viewport` + `SwRegister`; `public/manifest.webmanifest` + `sw.js` + icons; `next.config.mjs` `/sw.js` headers.

**Isolated last** because it's the only data-model + localStorage-schema change and the only SW/PWA caching surface.
**Gate:** legacy state without `doseReminder` loads **without wiping data** and gains `defaultDoseReminderPreference`; malformed value repaired non-destructively (medications intact); every existing `toEqual(demoState)` assertion passes (seeded default, migration default, and sanitize fallback are the **identical object**); `/manifest.webmanifest` + `/sw.js` served with `Cache-Control: no-store` + `Service-Worker-Allowed: /`; default user opted **out**; denied/unsupported path shows the in-app nudge without crashing.

### Phase 6 — Honest AI privacy disclosure
**Workstream G.** `i18n/strings.ts` 13 new EN+ES keys; `privacy-panel.tsx` `voiceMode` prop + mode-aware promise + honest audit label + confirm-delete dialog; `privacy/page.tsx` resolve `voiceMode` via `POST /api/realtime/token`; `food-ask-bar.tsx` live-mode disclosure line; `.env.example` + `docs/food-lens-demo.md` notes.

**Independent** (touches no file another area edits except `i18n/strings.ts`, which no one else touches).
**Gate:** `strings.test.ts` locale-parity passes (all 13 keys in en **and** es); mock mode shows on-device promise + "AI answer created on this device"; live mode shows the OpenAI live-voice disclosure; FoodAskBar renders the point-of-use disclosure EN+ES; "Delete demo data" opens a confirmation and only the confirm button calls `onReset`.

---

## 6. Workstream detail

### A. Reminders & one-place daily loop  *(Phase 5; High × M)*

**Data model — `src/domain/types.ts`**
```ts
export type ReminderPermission = "default" | "granted" | "denied" | "unsupported";

export type DoseReminderPreference = {
  enabled: boolean;               // opted in?
  weekdayTime: string;            // "HH:MM" 24h local, default "08:00"
  weekendTime: string;            // "HH:MM" 24h local, default "10:00"
  weekendAware: boolean;          // Sat/Sun use weekendTime; default true
  permission: ReminderPermission; // last-known Notification.permission (or "unsupported")
  lastPromptedAt: string | null;  // ISO; don't re-nag the permission ask
};
// AppState gains ONE required field (last): doseReminder: DoseReminderPreference
```

**New pure module — `src/domain/reminders.ts`** (no `window`/`Notification`; SSR-safe, unit-tested)
`DEFAULT_REMINDER_WEEKDAY_TIME`, `DEFAULT_REMINDER_WEEKEND_TIME`, `defaultDoseReminderPreference` (`enabled:false`), `isWeekend(date)`, `reminderTimeForDate(pref, date)`, `parseTimeToday(time, now)`, `isReminderDueNow(pref, todayDose, now)`, `isValidTimeString`, `isReminderPermission`.

**Reducer — `src/state/store.tsx`**: add `{ type: "setDoseReminder"; preference }` → sets `doseReminder` + appends an audit event (`"Daily reminder turned on/off"`), consistent with the app's audit-everything trust posture.

**Migration — `src/state/storage.ts`**: mirror the `mealLog`/`doseEvents` pattern exactly — inject `defaultDoseReminderPreference` when the key is absent, add `isDoseReminderPreference` guard, repair malformed values to the default **without wiping other data**, add the `isValidAppState` check. The seeded default, migration default, and sanitize fallback **must be the same object** (keeps the ~9 `toEqual(demoState)` assertions green).

**UI**
- `src/app/today/reminder-optin.tsx` (new): opt-in card — request permission, set weekday/weekend time, weekend-aware toggle; on denied/unsupported show "we'll show the reminder right here on Today."
- `src/hooks/use-dose-reminder.ts` (new): bridges the pure logic to `Notification`/service worker; schedules the next local notification; keeps `permission` in sync.
- `src/components/sw-register.tsx` (new) + `layout.tsx`: register `public/sw.js`; add `Metadata.manifest` + `Viewport`.
- `public/manifest.webmanifest`, `public/sw.js` (install `skipWaiting`, activate `clients.claim`, `notificationclick` → focus/deep-link to `/today`; **no fetch caching**), app icons.
- `next.config.mjs`: serve `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /`.
- **eb-6:** a plain `<Link href="/numbers">Log today's BP</Link>` at the bottom of the dose card (added in Phase 1 when the card is rewritten), so take-pill and log-BP live together.

**Acceptance**
- Opting in schedules a reminder at the weekday time; on Sat/Sun it uses the weekend time.
- With reminders on and today's dose not logged, after the reminder time the **Today in-app nudge** appears regardless of OS notification support.
- Default demo user is opted out; Today looks unchanged except the opt-in card + Log-BP link.
- Legacy stored state upgrades cleanly (no data loss).

---

### B. Prove it's working  *(Phase 1; High × S–M)*

**`src/domain/adherence.ts`** — add, keeping existing signatures byte-for-byte:
- `type BpTrendState = { kind: "none" } | { kind: "progress"; have: number; need: number } | { kind: "trend"; trend: BpTrend }`
- `summarizeBpTrendState(readings)` → returns `progress` (e.g. 3 of 5) below the threshold instead of `null`, so the "Is it working?" slot is never empty.
- `getScheduledAdherenceStreak(...)` — weekday/scheduled-aware streak that a Sat/Sun gap doesn't zero.
- `getScheduledAdherence(doseEvents, medId, windowDays, now)` → `{ taken, scheduledDays }` for a plain rate line.

**`src/components/dose-card.tsx`** — final props: `{ medication, todayDose, streak, trendState: BpTrendState, rate: { taken; scheduledDays }, onTake, onSkip, onUndo, reassurance? }`. Renders:
- `trendState.kind === "progress"` → *"3 of 5 readings — one more and I can show your trend."*
- `trendState.kind === "trend"` → existing "Is it working?" copy.
- rate line → *"Taken 4 of the last 5 weekdays — weekends are the gap."* (non-punitive).

**`src/domain/health-brief.ts`** — append one line to the medicines section: *"Recent doses: took X of the last N scheduled weekdays."* (derive reference date from `options.generatedAt`, guard invalid → `new Date()` for deterministic tests). This puts Jordan's missed-weekend pattern on the sheet his doctor reads.

**`src/domain/fixtures.ts`** — demoState → 6 **descending** readings + weekday `doseEvents`, so the flagship "improving" reassurance is visible in the demo.

**Acceptance:** a brand-new user (1 reading) sees a progress cue, not blank; the streak survives a weekend gap; the visit brief states the dose-taking record; the demo shows an improving trend.

---

### C. Barriers lead somewhere  *(Phase 3; High × S–M)*

**`src/ai/mock-provider.ts`** — `buildTroubleAnswer(request)` branches on the concern:
- cough/lightheaded → acknowledge it's a **known effect of this kind of medicine** (no diagnosis), route to care team (Call + Draft).
- cost → plain resource: *ask about a 90-day generic supply, pharmacy discount programs, patient-assistance.*
- ran-out / pharmacy → refill path (`tel:` pharmacy / request-refill prompt).
- "not worth it / feel fine" → **calls `buildWhyAnswer`** (shared with Coach) so answers stay consistent.
- Wire `if (request.mode === 'trouble')` **before** the generic fallback.

**`src/domain/tasks.ts`** — barrier-specific Today tasks with `?mode=` deep links (e.g. `['ran_out']` → "Get a refill"; `['cost']` → "Lower the cost"), exactly one medicine task.

**`src/components/dose-card.tsx`** — skip fieldset: **3 primary buttons** (Side effects / Forgot / Didn't feel needed) + a **"More reasons"** expander for the other five (mobile shows one column). Skipped-state shows a point-of-skip **reassurance** line for `does_not_feel_necessary` (reuses `carePlan.goals[goal-2].reason`) and a mode-scoped help link: `/chat?mode=why` for "doesn't feel necessary", `/chat?mode=trouble` otherwise. Keep the accessible name `Get help with this`.

**Acceptance:** every barrier produces a specific next step; the most dangerous barrier ("doesn't feel necessary") gets the silent-disease rebuttal **at the point of skipping**, not only if Jordan re-initiates in Coach.

---

### D. Coach that answers & stays safe  *(Phase 2; High × S–M)*

- **`buildWhyAnswer(medication, state)`** replaces the field-splice: directly names the **silent-disease logic** ("high blood pressure usually has no symptoms, so feeling fine is expected and isn't a sign the medicine is unneeded"), tied to Jordan's own trend/streak and `goal-2` reason. Sources `[medication.id, carePlan.id]`.
- **First-time symptom escalation — `safety-gate.ts`:** keep the pre-logged-barrier hard-escalate, and **add a no-barrier soft-escalate** that fires on `mentionsSideEffectConcern` alone (already matches `cough`/`lightheaded`), ACE-aware (reuse exported `ACE_ARB_NAMES`), optionally threading `suggestBarrier` so the UI can offer to log the side-effect barrier. This closes the gap where Jordan's **first-ever** cough disclosure got a bland, unrouted reply.
- **Harder guardrails — `safety.ts`:** add colloquial dose-change patterns — `lay off`, `wean/ease off`, `space out`, `every other day`, `skip on weekends`, `do I need it every day` — plus a conservative change-verb-near-drug catch-all, **without** swallowing bare `why`/`need` questions.
- **Context-aware draft — `care-team-message.ts`:** optional `concern?: { patientInput?; symptom? }` — replace the hardcoded question line with Jordan's typed words and add a "Symptom I noticed" line; fall back to the current sentence when absent. `chat/page.tsx` threads the latest patient input + classified symptom.
- **Plain safety copy — `conversation-panel.tsx`:** `Escalate to care now` → **"Please call your care team now"**; `Blocked for safety` → **"I can't answer that one — your care team can"**; drop the always-on "Safety guidance:" prefix and the allowed "Safe to continue" chip.

**Acceptance:** all three of Jordan's questions get real, safe answers; "why if I feel fine" no longer re-reads the card; a first cough disclosure routes to care; colloquial stop/skip phrasings block; the care-team draft contains what he just typed.

---

### E. Plain language & the Health Brief  *(Phase 1; High × S)*

- **`blood-pressure.ts`** call_clinic message → *"Your call-your-team number is 160 on top or 100 on the bottom. This reading (149/94) is under that."* (interpolate `carePlan.callThreshold*`, per-part null guards). This message is reused as the Coach escalation banner (drives 5 `safety-gate.test.ts` + 1 `conversation-panel` fixture updates).
- **`health-brief.ts`:** barriers via `barrierLabel()` (no more `side_effects` on the doctor's sheet); retitle **"Medicines and barriers" → "Medicines and what gets in the way"**; drop `mmHg`; per-reading `interpretBloodPressure` tag on each listed reading; align `food-instructions.ts` wording (optional).
- **`health-brief-card.tsx`:** route `section.status` through `evidenceStatusLabel()` (already exists) or drop the tag from the patient-facing brief — no more `patient_reported`/`needs_review`/`inferred`.
- **`numbers/page.tsx`:** attach a short plain tag to each listed reading, not just the latest.
- **`plan/page.tsx`:** reword "Confirmed instructions"/"Instructions to confirm"/"extracted"/"pending" to partner language, **and surface `carePlan.goals` + reasons** so *"medicine can help even when you do not feel symptoms"* is finally visible on My Plan.

**Acceptance:** grep finds no jargon/enum on any patient/clinician surface; Jordan can state his call-your-doctor number; My Plan answers "why, even though I feel fine."

---

### F. Accessibility 55+ & lower effort  *(Phase 4; High/Med × S–M)*

- **`globals.css`:** `html { font-size: 112.5% }` (scales all rem sizes); global `:focus-visible { outline: 3px solid var(--care); outline-offset: 2px }`. Promote informational `text-xs` (source attribution, "How we know this", timestamps) to ≥ `text-sm`; lift `text-ink/60|65` to pass AA.
- **`app-shell.tsx`:** cut primary bottom nav to **Today / My Numbers / My Medicines / Coach / More**; More reveals Plan, Visits, Food, Add Instructions, Privacy. Labels `text-sm`, icons `h-6 w-6`.
- **`bp-log-form.tsx`:** default "When was this?" from the clock (keep chips as override) so two numbers + Save works; add +/− steppers around the last value; keep entered values on error and show **per-field** inline errors (uses `parsed.error.issues`, incl. the `systolic ≤ diastolic` path); enlarge radios/checkboxes to ≥ 44px.
- **`numbers/page.tsx`:** prefill inputs from the last reading (`defaultValue`).
- **`intake/page.tsx`:** require **only** the pasted text; auto-title from the first line; default Source; show a real inline error (copy the BP-form pattern — currently fails silently).

**Acceptance:** the nav is one row of 5; focus is visible; no informational text below 14px or failing AA; BP saves without picking a chip; Intake saves with only pasted text and errors visibly when too short.

---

### G. Honest AI privacy disclosure  *(Phase 6; High × M)*

The blanket promise "keeps your data in browser storage on this device" is **false** when `HEALTH_AI_PROVIDER=openai` (the documented live-voice path POSTs audio + care-plan context to OpenAI).

- **`i18n/strings.ts`:** 13 new keys in **both** en and es (parity test enforces).
- **`privacy-panel.tsx`:** take a `voiceMode` prop; render a **mode-aware** promise (text Coach on-device; live voice sends specific data to a processor only while active); make the audit label honest ("AI answer created on this device" vs "AI voice answer via voice service"); add a **confirm-delete** dialog (currently wipes instantly).
- **`privacy/page.tsx`:** resolve `voiceMode` via `POST /api/realtime/token`.
- **`food-ask-bar.tsx`:** a point-of-use live-voice disclosure line (EN+ES).
- **`.env.example` / `docs/food-lens-demo.md`:** note the disclosure requirement before enabling `openai`.

**Acceptance:** default (mock) build still truthfully says on-device; live mode discloses the OpenAI hop in EN+ES; deleting data asks first.

---

## 7. Shared-file collision matrix (coordination-critical)

Several files are touched by multiple workstreams. **Apply all edits to a shared file as one combined edit per phase; keep the phase order.**

| File | Areas | Rule |
|------|-------|------|
| `src/components/dose-card.tsx` | A(eb-6), B, C, F | **Land once in Phase 1** with final props `{…, trendState, rate, reassurance?}` — **remove** old `trend` prop. Phase 3 only adds the skip-fieldset rewrite; Phase 4 only touches size/contrast classes. |
| `src/app/today/page.tsx` | A, B, C | One edit to the computed-vars block + `<DoseCard>`. Adherence imports become the union; drop `getAdherenceStreak`/`summarizeBpTrend`. Render order: in-app nudge → DoseCard → `ReminderOptin` → tasks. |
| `src/domain/fixtures.ts` | A, B | Phase 1 replaces readings/doseEvents; Phase 5 **appends** `doseReminder` to the already-mutated demoState. Same `defaultDoseReminderPreference` object everywhere. |
| `src/domain/health-brief.ts` | B, E | One edit: E owns retitles/labels/per-reading tags; B appends the "Recent doses" line to the renamed section. |
| `src/ai/mock-provider.ts` | C, D | D first (Phase 2: `buildWhyAnswer`, `export ACE_ARB_NAMES`); C (Phase 3: `buildTroubleAnswer`, whose not-worth-it path calls `buildWhyAnswer`). |
| `src/ai/safety-gate.ts` | D (direct), E (indirect via banner) | D is the only direct editor; E's blood-pressure rewrite flows into the banner (Phase-1 test updates). |
| `src/components/conversation-panel.tsx` | C, D, F | D reworks the safety chip text/condition (P2); C adds `initialMode` prop (P3); F adjusts sizes (P4) — different regions, sequential. |
| `src/app/chat/page.tsx` | C, D | Do once in Phase 3 incorporating P2 draft-threading + `initialMode` + `<Suspense>`. |
| `src/domain/care-team-message.ts` | D (direct), B (indirect) | D adds the `concern` param; B's fixture change shifts the last-3 readings (test only). |

---

## 8. Cross-cutting risks & mitigations

1. **localStorage migration (Phase 5):** `AppState` gains a required field. Mirror the `mealLog`/`doseEvents` migration; repair non-destructively; keep the seeded/migration/sanitize default identical so `toEqual(demoState)` stays green. Append `doseReminder` only **after** Phase 1's fixture rewrite.
2. **Multi-phase test churn:** `dose-card.test.tsx`, `conversation-panel.test.tsx`, `safety-gate.test.ts`, `care-team-message.test.ts` are edited across phases. Do the mechanical prop migration **once** (Phase 1); only add tests later; re-run the **full** suite at each gate.
3. **PWA/service-worker caching:** the app is localStorage-driven — a caching SW could pin stale JS/state. `sw.js` does **no** fetch caching; serve it `no-store`. No `next-pwa`/Workbox. Validate in the running session. Background push out of scope — document the in-app-nudge caveat in the runbook (mirroring the Food Lens "live voice unverified" note).
4. **i18n EN+ES parity (Phase 6):** every new key in **both** locales or `strings.test.ts` fails. Reminders deliberately avoids `strings.ts` (inline English) to protect parity.
5. **Shared-file race:** keep phase order; combined single edits per file per phase; verify the removed `trend` prop is actually gone and `demoState` still matches assertions.
6. **Safety guardrail preservation (Phases 2–3):** the no-diagnose/no-prescribe posture must survive. Safety gate runs before the provider; grep every new answer string for imperative `stop`/`increase`/`skip on weekends`; re-verify hard-escalations at each gate.
7. **Reference-date determinism (Phase 1):** derive the health-brief reference date from `generatedAt` (guard invalid); compute weekend/streak/rate integers against fixed fixture dates (`dose-1..dose-4 = 2026-06-30..07-03`, TODAY = Sun 2026-07-05 noon local).

---

## 9. Consolidated test plan (high level)

**Updated:** `dose-card.test.tsx` (prop migration + progress + More-reasons/href/reassurance), `adherence.test.ts` (new helpers, hand-verified integers), `health-brief.test.ts` (+`health-brief-card.test.tsx`), `blood-pressure.test.ts`, `safety-gate.test.ts` (banner wording + cough tests), `conversation-panel.test.tsx` (banner fixture + guidance labels + initialMode), `care-team-message.test.ts` (132/84 + concern), `mock-provider.test.ts` (why + trouble), `safety.test.ts` + `safety-dose-change.test.ts` (colloquial), `intent.test.ts` (ran-out/cost → trouble), `app-shell.test.tsx` (nav + More), `bp-log-form.test.tsx` (clock default + per-field error), `e2e/home-health.spec.ts` (brief heading + why wording), storage/dose-storage/store/reducer (Phase 5 migration + `setDoseReminder`).

**New:** `reminders.test.ts`, `reminder-optin.test.tsx`, `tasks.test.ts`, `privacy-panel.test.tsx` (voiceMode + confirm-delete), `food-ask-bar.test.tsx` (live disclosure), optional `intake/page.test.tsx` + `numbers/page.test.tsx`.

---

## 10. How we'll know Jordan is better off (success metrics)

- **Weekday & weekend adherence rate** (`getScheduledAdherence` over 7/30 days) — target: close the weekend gap.
- **% of users who opt into reminders**, and adherence lift for opted-in vs not.
- **% of skip/barrier events that reach a resolved next step** (refill tapped, cost resource viewed, care-team draft shared) vs. dead-ends.
- **Coach answer quality:** share of Coach turns hitting the generic fallback → near zero for why/trouble intents; safety blocks still 100% on dose-change phrasings.
- **"Is it working?" visible by day one** (progress cue present below 5 readings).
- **Qualitative pass:** grep shows zero jargon/enum on patient surfaces; a tester can state their call-your-doctor number; the Health Brief carries missed-dose + side-effect history with no machine tokens.

---

## 11. Fix-only-five (if scope must shrink)

In order — the five changes that most move Jordan to take tomorrow's pill:
1. **Weekend-aware daily reminder** (Workstream A / Phase 5).
2. **Prove it's working early** — graded trend + adherence rate (Workstream B / Phase 1).
3. **Barriers lead somewhere** — trouble handler + refill/cost/side-effect paths (Workstream C / Phase 3).
4. **Answer "why, if I feel fine?"** for real + rebut at the point of skipping (Workstreams D+C / Phases 2–3).
5. **Remove daily friction + give him his number** — clock-default logging + "your call-your-team number is 160 on top / 100 on the bottom" (Workstreams F+E / Phases 1,4).
