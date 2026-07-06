# Adherence & Trust Uplift — Execution Plan (Runbook)

**Companion to:** [`docs/adherence-trust-uplift-spec.md`](./adherence-trust-uplift-spec.md) — read the spec for the *what/why*; this runbook is the *how*, in order.
**Status:** Ready to execute
**Scope:** 6 phases · 55 tasks · ~29 hours of focused work (~4–5 dev-days solo; ~2 weeks calendar with review)

---

## 0. How to use this runbook

- Each phase is a self-contained, shippable unit gated by `npm run check` (lint + full vitest + `next build`) **plus** the phase-specific checklist.
- Work tasks **top to bottom within a phase** — they're dependency-ordered.
- After each **commit point**, the tree is green and releasable.
- Every task has a **verify command** and a **done-when**; don't move on until both pass.
- The full change text for each task is in the spec's workstream sections (§6) + the code itself — this runbook gives the sequence, files, commands, gates, and checkpoints.

### Working agreement
- **Branch per phase:** `git checkout -b phase-1-plain-language` … land the phase's commits … open a PR or fast-forward to `master`. (Solo-on-master is fine too — the commit boundaries below are the checkpoints either way. Don't push until you ask.)
- **Land shared files once per phase, as one combined edit.** Never leave a removed prop behind (the recurring failure mode is `dose-card.tsx`).
- **Run the *full* vitest suite at every gate,** not just the phase's own tests — several test files are edited across phases.
- **Do not start a second dev server** — a preview session is already running; use it for the Phase 4/5 visual spot-checks.

### Sequencing & parallelization
```
Critical path:  Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──▶ Phase 5
Independent:    Phase 6  (touches only i18n/privacy/food-ask-bar — run anytime)
```
- **Phase 1 first, always** — it establishes the final `DoseCardProps` shape and the mutated `demoState` that Phases 2/3/5 build on, with **zero schema risk**.
- **Phase 2 → 3** are tightly coupled (Phase 3's trouble handler calls Phase 2's `buildWhyAnswer`; both touch `mock-provider.ts`, `conversation-panel.tsx`, `chat/page.tsx`).
- **Phase 4** runs after the content phases so the presentational sweep lands on **final copy**.
- **Phase 5** is isolated last — it's the only data-model + localStorage change and the only PWA/service-worker surface.
- **Phase 6** is fully independent (only `i18n/strings.ts` is "shared", and no other phase touches it) → a **second engineer can run Phase 6 in parallel** with Phases 1–4 anytime. A second engineer can also pick up **Phase 5** once Phase 3's `today/page.tsx` edits have landed (coordinate the one `today/page.tsx` merge).

---

## Phase 1 — Plain language + adherence proof  *(no data-model change → zero migration risk)*
**Spec:** §6.E + §6.B · **~5.5h · 13 tasks · 4 commits**
Strips jargon/enums from every patient- and clinician-facing surface, gives Jordan his call-your-team number in top/bottom words, and proves the pill is working early (graded trend, weekday-aware rate/streak, dose history on the brief). **Establishes the final `DoseCardProps` shape and the mutated `demoState`.**

| # | Task | Files | Verify | Est |
|---|------|-------|--------|-----|
| T1 | Rewrite `call_clinic` message → "Your call-your-team number is 160 on top or 100 on the bottom…" | `domain/blood-pressure.ts` | `vitest run domain/blood-pressure.test.ts` | 20m |
| T2 | Update 5 safety-gate + 1 conversation-panel **banner** assertions to new wording | `ai/safety-gate.test.ts`, `components/conversation-panel.test.tsx` | `vitest run ai/safety-gate.test.ts components/conversation-panel.test.tsx` | 15m |
| T3 | Health Brief: `barrierLabel()`, retitle "Medicines and what gets in the way", drop `mmHg`, per-reading meaning tags, top/bottom threshold | `domain/health-brief.ts` | `vitest run domain/health-brief.test.ts` | 35m |
| T4 | Health Brief card: route `section.status` → `evidenceStatusLabel()` (no more `patient_reported`/`needs_review`) | `components/health-brief-card.tsx` | `vitest run components/health-brief-card.test.tsx` | 20m |
| T5 | My Numbers: plain tag on **every** listed reading + lift muted contrast | `app/numbers/page.tsx` | `npm run check`; `rg 'text-ink/65' app/numbers/page.tsx` → none | 20m |
| T6 | My Plan: partner language + **surface `carePlan.goals` + reasons** ("why the pill matters even when you feel fine") | `app/plan/page.tsx` | `npm run check`; `rg 'extracted\|Confirmed instructions\|Instructions to confirm' app/plan/page.tsx` → none | 25m |
| **⎘ commit** | after T2 · after T6 | | | |
| T7 | `adherence.ts`: add `BpTrendState` + `summarizeBpTrendState` (graded < 5 readings) + `getScheduledAdherenceStreak` + `getScheduledAdherence` (existing sigs untouched) | `domain/adherence.ts` | `vitest run domain/adherence.test.ts` | 50m |
| T8 | `fixtures.ts`: demoState → **6 descending readings + 4 weekday doseEvents** | `domain/fixtures.ts` | `vitest run domain/care-team-message.test.ts state/ domain/adherence.test.ts` | 30m |
| **⎘ commit** | after T8 | | | |
| T9 | `dose-card.tsx`: land **final props** `{…, trendState, rate, reassurance?}` (**remove `trend`**) + progress/rate/weekend copy + eb-6 `Log today's BP` link | `components/dose-card.tsx` | `vitest run components/dose-card.test.tsx` | 45m |
| T10 | `today/page.tsx`: swap adherence imports + DoseCard props to new shape | `app/today/page.tsx` | `npm run check`; `rg 'getAdherenceStreak\|summarizeBpTrend\b\|trend=\{trend\}' app/today/page.tsx` → none | 20m |
| T11 | `health-brief.ts`: append **"Recent doses: took X of the last N scheduled weekdays"** (derive ref date from `generatedAt`, guard invalid) | `domain/health-brief.ts` | `vitest run domain/health-brief.test.ts` | 30m |
| T12 | e2e: rename brief-heading selector to new title | `e2e/home-health.spec.ts` | `rg 'Medicines and barriers' e2e src` → none | 10m |
| T13 | **Phase gate:** grep sweep + full check | — | `npm run check`; greps for `call threshold`/`mmHg`/`activeBarriers.join`/`status.replace(`/`trend={` → none on patient surfaces | 20m |
| **⎘ commit** | after T13 | | | |

**Commits:** `feat(brief): give Jordan his call-your-team number…` (T2) · `feat(brief): plain-language Health Brief + why-this-matters goals on My Plan` (T6) · `feat(adherence): scheduled/weekend-aware helpers + graded trend; improving 6-reading demo` (T8) · `feat(today): final DoseCard shape (trendState+rate, drop trend), rate/progress copy, eb-6 Log-BP link, Recent-doses on brief` (T13)
**Gate:** `npm run check` green; grep confirms **no** patient surface renders `call threshold`/`systolic`/`diastolic`/`mmHg`/raw barrier enum/underscored status; all 6 dose-card renders migrated + progress test; the banner assertions read "call-your-team number"; brief shows "Medicines and what gets in the way" + "Recent doses"; care-team-message asserts `132/84`.
**Rollback:** revert the phase branch/commits; no schema or storage change, so nothing to migrate back.

---

## Phase 2 — Coach that answers and stays safe
**Spec:** §6.D · **~2h45m · 8 tasks · 3 commits** · *depends on Phase 1 helpers + fixture + plain banner*

| # | Task | Files | Verify | Est |
|---|------|-------|--------|-----|
| T1 | `export const ACE_ARB_NAMES` | `ai/mock-provider.ts` | `rg 'export const ACE_ARB_NAMES'` = 1; mock-provider tests green | 5m |
| T2 | Rewrite why-mode → `buildWhyAnswer(medication, state)` naming the **silent-disease logic** (uses goal-2 + trend + streak) | `ai/mock-provider.ts` | `vitest run ai/mock-provider.test.ts`; `rg 'is listed in your medicines as'` → 0 | 30m |
| **⎘ commit** | after T2: `feat(coach): buildWhyAnswer names silent-disease logic; export ACE_ARB_NAMES` | | | |
| T3 | Add **first-time no-barrier soft-escalate** on a cough/side-effect disclosure (ACE-aware) | `ai/safety-gate.ts`, `ai/types.ts` | `vitest run ai/safety-gate.test.ts` (pre-logged + chest-pain still hard-escalate) | 30m |
| T4 | Add colloquial dose-change patterns + conservative catch-all (don't swallow bare why/need) | `domain/safety.ts` | `vitest run domain/safety.test.ts domain/safety-dose-change.test.ts` | 30m |
| **⎘ commit** | after T4: `feat(safety): first-time cough soft-escalate + colloquial dose-change guardrails` | | | |
| T5 | Optional `concern` param on `buildCareTeamMessage` (patient's words + Symptom line; exact fallback) | `domain/care-team-message.ts` | `vitest run domain/care-team-message.test.ts` | 20m |
| T6 | Reword safety copy ("Please call your care team now" / "I can't answer that one — your care team can"); drop always-on "Safety guidance:" + allowed chip | `components/conversation-panel.tsx` | `vitest run components/conversation-panel.test.tsx`; `rg 'Safety guidance:'` → 0 | 20m |
| T7 | Thread latest patient input + classified symptom into the draft | `app/chat/page.tsx` | `npm run build`; `rg 'buildCareTeamMessage(state, '` present | 20m |
| T8 | Update e2e why-wording assertion | `e2e/home-health.spec.ts` | e2e why assertion targets new copy | 10m |
| **⎘ commit** | after T8: `feat(coach): context-aware care-team draft + plain safety copy; e2e why wording` | | | |

**Gate:** pre-logged `side_effects` still **hard**-escalates; `chest pain` first; the 6 colloquial phrases block while *"do I even need this?"* / *"why am I taking lisinopril?"* stay allowed; new escalate/blocked copy shows, allowed chip gone; grep new copy for imperative `stop`/`increase`/`every other day` → none.
**Rollback:** revert the phase commits; no schema change. If only T6 regresses UI, it reverts independently (copy-only).

---

## Phase 3 — Barriers lead somewhere + deep-link plumbing
**Spec:** §6.C · **~5h · 8 tasks · 5 commits** · *depends on Phases 1–2 (reuses `buildWhyAnswer`, settled DoseCard/ConversationPanel)*

| # | Task | Files | Verify | Est |
|---|------|-------|--------|-----|
| T1 | `buildTroubleAnswer(request)` (cough→ACE routing, cost→90-day/discount/assistance, ran-out→refill `tel:`, not-worth-it→calls `buildWhyAnswer`); wire before generic fallback | `ai/mock-provider.ts` | `vitest run ai/mock-provider.test.ts` | 60m |
| T2 | `intent.ts` routes ran-out/cost → `trouble` (assert; no logic change) | `ai/intent.ts` (test) | `vitest run ai/intent.test.ts` | 20m |
| **⎘ commit** | after T2: `feat: barrier-aware trouble answers + intent coverage` | | | |
| T3 | Barrier-specific Today tasks with `?mode=` deep links (**exactly one** medicine task) | `domain/tasks.ts` + new `domain/tasks.test.ts` | `vitest run domain/tasks.test.ts` | 50m |
| **⎘ commit** | after T3: `feat: barrier-specific Today tasks with mode deep links` | | | |
| T4 | `ConversationPanel` `initialMode` prop seeds the mode chip | `components/conversation-panel.tsx` | `vitest run components/conversation-panel.test.tsx` | 35m |
| T5 | `chat/page.tsx`: read/validate `?mode=` → `initialMode`, wrap `useSearchParams` in `<Suspense>`, keep Phase-2 draft threading | `app/chat/page.tsx` | `npm run build` (Suspense boundary), invalid mode → explain | 40m |
| **⎘ commit** | after T5: `feat: chat deep-link plumbing (initialMode + Suspense ?mode=)` | | | |
| T6 | DoseCard skip fieldset **3 primary + "More reasons"**; point-of-skip reassurance for `does_not_feel_necessary`; mode-scoped help link (`/chat?mode=why` vs `?mode=trouble`), keep accessible name; add optional `reassurance` prop | `components/dose-card.tsx` | `vitest run components/dose-card.test.tsx` | 55m |
| T7 | Pass `reassurance={goal-2 reason}` from Today | `app/today/page.tsx` | `npm run build` | 15m |
| **⎘ commit** | after T7: `feat: DoseCard 3+More barrier split, point-of-skip reassurance, mode-scoped help link` | | | |
| T8 | **Phase gate** sweep | — | `npm run check && vitest run ai/safety-gate.test.ts` (dose-change still `blocked` — gate fires first) | 30m |
| **⎘ commit** | after T8: `chore: Phase 3 gate green` | | | |

**Gate:** trouble handler returns routed non-filler for cough/cost/ran-out/not-worth-it/fallback; safety gate **still fires first** for dose-change; DoseCard shows 3 primary + More with correct mode-scoped links and unchanged accessible name; `/chat?mode=trouble` preselects Trouble; invalid `?mode=` → explain without crashing; exactly one medicine task.
**Rollback:** revert commits; deep-link `?mode=` is additive (old URLs still work).

---

## Phase 4 — Accessibility 55+ & lower effort
**Spec:** §6.F · **~5h · 7 tasks · 6 commits** · *runs after content phases so the sweep lands on final copy*

| # | Task | Files | Verify | Est |
|---|------|-------|--------|-----|
| F1 | Global 112.5% type scale + `:focus-visible` ring + `--care` var | `styles/globals.css` | `rg 'font-size: 112.5%'`, `rg 'focus-visible'`, `rg -- '--care: #217c70'`; `npm run lint` | 15m |
| **⎘ commit** | after F1: `feat(a11y): global type scale + focus-visible ring` | | | |
| F2 | Collapse bottom nav → **5 tiles + "More"** disclosure | `components/app-shell.tsx` | `vitest run components/app-shell.test.tsx` | 50m |
| **⎘ commit** | after F2: `feat(nav): 5-tile bottom nav with More disclosure` | | | |
| F3 | BP form: **clock-default context** + `+/-` steppers + per-field inline errors + ≥44px radios | `components/bp-log-form.tsx` | `vitest run components/bp-log-form.test.tsx domain/schemas.test.ts` | 75m |
| **⎘ commit** | after F3: `feat(bp-form): clock-default context, steppers, per-field errors, 44px radios` | | | |
| F4 | My Numbers: prefill inputs from last reading + contrast | `app/numbers/page.tsx` | `vitest run components/bp-log-form.test.tsx`; `rg 'defaultSystolic'` | 35m |
| F5 | Add Instructions: **require only pasted text**, auto-title, default source, real inline error | `app/intake/page.tsx` | `vitest run domain/schemas.test.ts`; `rg 'role="alert"' app/intake/page.tsx` | 45m |
| **⎘ commit** | after F5: `feat(logging): prefill My Numbers; Add Instructions needs only pasted text + inline error` | | | |
| F6 | Sweep informational `text-xs`→`text-sm` + lift `text-ink/60|65` across cards | 8 components | `vitest run` (8 component suites) | 40m |
| **⎘ commit** | after F6: `style(a11y): lift small/low-contrast text to AA across cards` | | | |
| F7 | **Phase gate:** full check + grep + **visual spot-check in the running session** | — | `npm run check`; nav shows 5 tiles; focus ring on tab; BP saves with no chip; steppers clamp; Intake errors < 10 chars | 25m |
| **⎘ commit** | after F7: `chore: Phase 4 accessibility gate green` | | | |

**Gate:** bottom nav 5 tiles + More reveals the 5 secondary links + Add; `:focus-visible` ring visible; no informational text at `text-xs` or `text-ink/60|65`; BP saves with no chip; steppers clamp to schema ranges; Intake saves with only pasted text and errors visibly under 10 chars.
**Rollback:** revert commits; F1 (global CSS) reverts independently if the scale needs tuning.

---

## Phase 5 — Reminders / PWA flagship  *(only phase with a schema change)*
**Spec:** §6.A + §4.1 · **~6.5h · 12 tasks · 4 commits** · *isolated last; depends on Phase-1 fixtures + Phase-3 `today/page.tsx`*

| # | Task | Files | Verify | Est |
|---|------|-------|--------|-----|
| T1 | `types.ts`: `ReminderPermission` + `DoseReminderPreference` + `AppState.doseReminder` (required, last field) | `domain/types.ts` | `tsc --noEmit` → new errors **only** at the 3 fixture literals + `storage.ts` sanitize | 10m |
| T2 | **NEW** `domain/reminders.ts` (pure, SSR-safe): defaults + `isWeekend`/`reminderTimeForDate`/`parseTimeToday`/`isReminderDueNow`/guards | `domain/reminders.ts` (+test) | `vitest run domain/reminders.test.ts` | 45m |
| T3 | `fixtures.ts`: append `doseReminder: defaultDoseReminderPreference` to **all 3** AppState literals (`demoState`, `deletedDemoState`, `brentState`) | `domain/fixtures.ts` | `tsc --noEmit`; `rg -c 'doseReminder: defaultDoseReminderPreference' fixtures.ts` = 3 | 15m |
| T4 | `store.tsx`: `setDoseReminder` action (sets pref + audit event) | `state/store.tsx` | `vitest run state/dose-reducer.test.ts` | 25m |
| T5 | `storage.ts`: migrate absent key → default, `isDoseReminderPreference` guard, **non-destructive** sanitize, `isValidAppState` check | `state/storage.ts` | `vitest run state/dose-storage.test.ts state/storage.test.ts`; `tsc --noEmit` clean | 40m |
| T6 | **Shared-file gate:** full `state/` suite green (every `toEqual(demoState)`) | — | `vitest run state/` | 15m |
| **⎘ commit** | after T6: `feat(reminders): schema + pure module + non-destructive migration + setDoseReminder` | | | |
| T7 | **NEW** `hooks/use-dose-reminder.ts` (bridge to Notification/SW, sync permission, schedule) | `hooks/use-dose-reminder.ts` | `tsc --noEmit` | 45m |
| T8 | **NEW** `app/today/reminder-optin.tsx` (permission, weekday/weekend time, weekend-aware toggle, denied/unsupported fallback copy) | `app/today/reminder-optin.tsx` (+test) | `vitest run app/today/reminder-optin.test.tsx` | 55m |
| **⎘ commit** | after T8: `feat(reminders): opt-in card + use-dose-reminder hook (weekend-aware, fallback)` | | | |
| T9 | **NEW** `components/sw-register.tsx` + wire `layout.tsx` (`Metadata.manifest` + `Viewport`) | `components/sw-register.tsx`, `app/layout.tsx` | `tsc --noEmit`; `rg 'manifest' app/layout.tsx`; `rg 'serviceWorker.register'` | 25m |
| T10 | **NEW** `public/manifest.webmanifest` + `public/sw.js` (**no fetch caching**) + icons; `next.config.mjs` `/sw.js` headers | `public/*`, `next.config.mjs` | validate JSON; `rg 'skipWaiting\|clients.claim\|notificationclick' public/sw.js`; `rg 'no-store\|Service-Worker-Allowed' next.config.mjs` | 40m |
| T11 | `today/page.tsx`: reminder-due nudge banner + `<ReminderOptin>` + dispatch `setDoseReminder` | `app/today/page.tsx` | `tsc --noEmit`; `rg 'ReminderOptin\|isReminderDueNow\|setDoseReminder' app/today/page.tsx` | 30m |
| **⎘ commit** | after T11: `feat(pwa): service worker + manifest + no-store headers + Today nudge & opt-in` | | | |
| T12 | **Phase gate:** full check + migration/SW greps | — | `npm run check`; SW headers present; 3 identical fixture defaults; exact fallback copy present | 20m |
| **⎘ commit** | after T12: `chore(reminders): green phase gate` | | | |

**Gate:** legacy state without `doseReminder` loads **without wiping data** and gains the default; malformed value repaired non-destructively (medications intact); every `toEqual(demoState)` passes; `/manifest.webmanifest` + `/sw.js` served with `no-store` + `Service-Worker-Allowed: /`; default user opted **out** (Today unchanged except opt-in card + Log-BP link); denied/unsupported shows the in-app nudge without crashing.
**Rollback:** revert commits. The migration is **non-destructive and forward-only** — reverting the code leaves any already-migrated localStorage readable by the old code (the extra `doseReminder` key is ignored). If the SW misbehaves, ship a `sw.js` that `unregister()`s and `skipWaiting`, or bump the SW URL. **Note:** background push (VAPID) is out of scope — the reliable path is the in-app Today nudge; record this in the runbook/memory like the Food Lens "live voice unverified" caveat.

---

## Phase 6 — Honest AI privacy disclosure  *(independent — parallelizable)*
**Spec:** §6.G · **~4h · 7 tasks · 3 commits** · *no dependency on any other phase*

| # | Task | Files | Verify | Est |
|---|------|-------|--------|-----|
| T1 | Add **13** privacy/disclosure keys to `FoodLensStringKey` + **en + es** | `i18n/strings.ts` | `vitest run i18n/strings.test.ts` (parity) | 35m |
| **⎘ commit** | after T1: `feat(i18n): mode-aware privacy + live-voice disclosure strings (EN+ES)` | | | |
| T2 | PrivacyPanel: `voiceMode` prop + **mode-aware promise** + honest audit label | `components/privacy-panel.tsx` | `tsc --noEmit` | 40m |
| T3 | PrivacyPanel: **confirm-delete** dialog with "Keep my data" cancel | `components/privacy-panel.tsx` | `vitest run components/privacy-panel.test.tsx` | 50m |
| T4 | `privacy/page.tsx`: resolve `voiceMode` via `POST /api/realtime/token`, pass down | `app/privacy/page.tsx` | `tsc --noEmit && vitest run components/privacy-panel.test.tsx` | 30m |
| T5 | FoodAskBar: point-of-use live-voice disclosure (EN+ES) | `components/food-ask-bar.tsx` | `vitest run components/food-ask-bar.test.tsx` | 25m |
| **⎘ commit** | after T5: `feat(privacy): mode-aware disclosure + confirm-delete; live-voice disclosure in Food Lens` | | | |
| T6 | Document the disclosure requirement | `.env.example`, `docs/food-lens-demo.md` | `rg 'disclosure' .env.example docs/food-lens-demo.md` | 15m |
| T7 | **Phase gate** | — | `npm run check`; `rg 'keeps your data in browser storage' src` → none | 20m |
| **⎘ commit** | after T7: `docs(privacy): note live-voice disclosure requirement` | | | |

**Gate:** `strings.test.ts` parity passes (13 keys en+es); mock mode shows on-device promise + "AI answer created on this device"; live mode shows the OpenAI live-voice disclosure + "AI voice answer via voice service"; FoodAskBar renders the disclosure EN+ES; Delete asks first and only confirm calls `onReset`; old hardcoded on-device string gone.
**Rollback:** revert commits — display-time only, no schema/behavior change.

---

## Definition of done (whole program)

- [ ] All 6 phases merged; `npm run check` green on `master`.
- [ ] **Adherence:** opt-in weekend-aware reminder ships; the in-app Today nudge fires when a dose is due and unlogged; "Is it working?" shows a progress cue below 5 readings; a plain, weekday-aware adherence rate is visible; the visit brief carries the dose-taking record.
- [ ] **Coach:** "why if I feel fine?" gets the silent-disease answer; a first-time cough disclosure routes to care; colloquial stop/skip phrasings block; the care-team draft carries the patient's typed concern; safety copy is plain.
- [ ] **Barriers:** every skip/barrier leads to a concrete next step; "doesn't feel necessary" gets the rebuttal at the point of skipping.
- [ ] **Plain language:** grep finds **no** `call threshold`/`systolic`/`diastolic`/`mmHg`/raw enum/underscored status on any patient/clinician surface; My Plan answers "why, even though I feel fine."
- [ ] **Accessibility:** 112.5% base type, visible focus rings, 5-tile nav, AA contrast, one-tap-fast logging.
- [ ] **Trust:** privacy promise is mode-aware and honest in EN+ES; delete asks first.
- [ ] **Metrics wired** (spec §10): weekday/weekend adherence rate, reminder opt-in %, % of barriers reaching a resolved step, Coach generic-fallback rate, trend-visible-by-day-1.

---

## Risk register (see spec §8 for detail)

| Risk | Phase | Mitigation |
|------|-------|-----------|
| localStorage migration wipes data | 5 | Mirror `mealLog`/`doseEvents` migration; non-destructive sanitize; identical default object everywhere; `toEqual(demoState)` gate. |
| Multi-phase test churn (dose-card, conversation-panel, safety-gate, care-team-message) | 1–3 | Do the mechanical prop migration **once** in Phase 1; only add tests later; run the **full** suite at each gate. |
| Service-worker caches stale JS/state | 5 | `sw.js` does **no** fetch caching; `no-store` headers; no `next-pwa`/Workbox; validate in the running session. |
| i18n EN/ES parity break | 6 | Every key in both locales; reminders deliberately avoids `strings.ts`. |
| Shared-file prop drift (leftover `trend` prop) | 1,3,5 | Keep phase order; one combined edit per shared file per phase; grep for the removed prop at each gate. |
| Safety guardrail regression | 2,3 | Gate re-verifies pre-logged/chest-pain hard-escalate + all colloquial blocks; grep new copy for imperative dose-change verbs. |
| Flaky date-dependent tests | 1 | Derive brief ref-date from `generatedAt`; fixed `TODAY = 2026-07-05 noon`; hand-verify integers (`taken:4 / scheduledDays:5`). |

---

## Estimate & suggested calendar

| Phase | Tasks | Est | Ships |
|-------|-------|-----|-------|
| 1 · Plain language + proof | 13 | ~5.5h | Day 1 |
| 2 · Coach answers & safe | 8 | ~2.75h | Day 2 |
| 3 · Barriers lead somewhere | 8 | ~5h | Day 2–3 |
| 4 · Accessibility & effort | 7 | ~5h | Day 3–4 |
| 5 · Reminders / PWA | 12 | ~6.5h | Day 4–5 |
| 6 · Privacy disclosure | 7 | ~4h | parallel |
| **Total** | **55** | **~29h** | **~4–5 dev-days solo; ~2 wks w/ review** |

**Two-engineer split:** Eng A runs the critical path 1→2→3→4→5; Eng B runs Phase 6 immediately (independent) and picks up Phase 5's non-`today` work once Phase 3's `today/page.tsx` lands.

**Start here:** Phase 1 · Task T1 — `git checkout -b phase-1-plain-language`, edit `src/domain/blood-pressure.ts`, run `npx vitest run src/domain/blood-pressure.test.ts`.
