# rhtp-prototype scavenge notes — the ideas that did not port

The `rhtp-prototype` exploration ground is retired (plan 09). Its safety spine
(crisis red-flags, grounding, voice safety, PDC, SDOH, accessibility,
PhoneFrame) was ported in sprint 08, and its diabetic-retinopathy screening
pathway (gap machine, protocol machine, site matching, ky-geo, coverage
logistics, nudge disclosure lint, find/plan/result UX) was folded into the base
app as `/screening` in this sprint. Everything below is the *unported* half —
concepts worth keeping as ideas, with pointers into the archive.

**Archive: `github.com/Tamathe/RHTP@9687c42a8686253b34de6fc54eae9bbf7e0c6a3d`** (final snapshot, pushed at retirement — includes the previously-uncommitted DR-finder working tree).

## Navigator hub views

- **What:** A staff-side hub (`src/components/hub/HubShell.tsx`) with a gap
  list (`GapListView`), navigator queue (`NavigatorQueueView`), referral queue
  (`ReferralQueueView`), program outcomes (`ProgramOutcomesView`), patient
  timeline (`PatientTimelineView`), and a county expansion map
  (`ExpansionMapView`).
- **Why it mattered:** The patient app closes one loop; the hub is how a CHW
  team works five hundred loops at once, ranked by urgency. Deliberately out of
  scope for the patient-owned, single-patient app (sprint-08 precedent) — the
  patient-side stand-ins are visible status plus drafted care-team messages.

## Equity metrics + small-cell suppression

- **What:** `src/lib/equity-metrics.ts` computed screening-completion equity
  cuts (county, payer, language) with small-cell suppression so no cut under
  n=11 ever rendered; `server/equity-metrics-gate.ts` enforced it.
- **Why it mattered:** Kentucky's DR burden is an equity story; the suppression
  discipline is what makes program dashboards publishable without re-identifying
  patients.

## Billing evidence (CCM / RPM / APCM / CHW)

- **What:** `src/lib/billing-artifacts.ts` + `BillingEvidenceView` assembled
  per-activity billing evidence (time logs, consent, care-plan linkage) for
  CCM/RPM/APCM/CHW codes; `server/billing-artifact-gate.ts` refused artifacts
  with missing evidence.
- **Why it mattered:** Navigation work is only sustainable if it bills; the
  evidence-first shape (never bill what you cannot show) is the keeper idea.

## Grant reporting packets

- **What:** `src/lib/grant-reporting.ts` + `server/grant-reporting-gate.ts`
  rendered funder-ready outcome packets (screenings completed, referrals
  closed, equity cuts) from the same event stream the app already records.
- **Why it mattered:** RHTP-style programs live on grants; reporting derived
  from real events (not hand-built spreadsheets) is the difference between a
  weekend and a quarter.

## Navigator enrollment + identity proofing

- **What:** `src/lib/navigator-enrollment.ts`, `NavigatorEnrollmentView`, and
  `src/lib/identity-corroboration.ts` (+ `server/identity-gate.ts`): in-person,
  offline-capable enrollment with navigator attestation and a trust handoff to
  the patient's own login.
- **Why it mattered:** The first mile — a patient with no portal account, in a
  waiting room, on bad wifi — decides whether anything else ever runs.

## Part 2 / break-glass / async access

- **What:** `server/part2-gate.ts` + `part2-suppression.ts` (42 CFR Part 2
  segmentation), `server/break-glass-access.ts` (audited emergency access),
  `server/async-access.ts` + `async-access-gate.ts` (scoped, expiring access
  tokens), `server/adolescent-consent-policy.ts`.
- **Why it mattered:** The moment a second person (navigator, clinician,
  parent) can see patient data, these are the walls. The patient-owned app
  dodges the problem by having exactly one reader; any hub sprint inherits it
  on day one.

## Protocol-pack generalization (multi-condition screening)

- **What:** `src/lib/protocol-packs.ts` + `server/p6-protocol-pack-gate.ts`
  generalized the retinopathy pathway into declarative packs (gap definition,
  outreach script, outcome taxonomy, referral rules) so colorectal/A1c/BP
  screening could ship as data, not code.
- **Why it mattered:** Detection-is-solved/navigation-is-the-product is not an
  eye-specific insight. The base app's dr-triage table is the hand-rolled
  instance of what packs would make declarative.

## Clinician writeback rail

- **What:** `server/clinician-writeback.ts` + `p8-writeback-gate.ts` staged
  app-side events (result confirmed, referral booked) into a review queue a
  clinician approves before anything touches an EHR.
- **Why it mattered:** The app must never write to a chart on its own; the
  approve-then-write rail is the honest integration shape when FHIR arrives.

## Ops gate + release-packet discipline

- **What:** `server/local-release-gate.ts`, `deploy-receipt.ts`,
  `public-preview-gate.ts`, and per-feature gates (`*-gate.ts` across
  `server/`) composed into a release packet: every feature shipped with its
  gate green, receipts logged.
- **Why it mattered:** A clinical-adjacent app needs release evidence, not
  vibes. The base app's `npm run check` + `crisis:gate` is the trimmed
  descendant; the packet idea scales it.

## Longitudinal health + health alerts

- **What:** `src/lib/longitudinal-health.ts` + `health-alerts.ts` (+
  `HealthAlertCenter`, `HealthCompanionScreen`) derived trends across years of
  events and raised quiet alerts (missed recall, rising A1c pattern).
- **Why it mattered:** The recall reminder in the base app is one thread of
  this; the general engine watches every thread at once.

## Voice red-team drills

- **What:** `server/live-voice-drill.ts` + `src/lib/realtime-voice-browser.ts`
  scripted adversarial voice sessions (crisis phrasing, med-change asks) against
  the live voice loop and scored the gate's interception.
- **Why it mattered:** Voice safety decays silently as prompts evolve; drills
  make the decay visible. The base app's `crisis:gate` covers text; a voice
  drill harness is the missing twin.

## SMS campaign machinery

- **What:** `server/p7-screenings-campaigns.ts` (+ gate) ran cohort outreach:
  eligible-patient selection, approved-template sends via the sms-disclosure
  lint, reply handling, opt-out, and campaign metrics.
- **Why it mattered:** The base app renders one nudge for one patient; the
  campaign engine is how 500K diabetics hear about cameras near them. The
  lock-screen disclosure lint (no condition words on a lock screen) ported in
  concept; the send machinery did not.

## Also left behind

- `src/lib/retinopathy-education.ts` + `LearnScreen`/`EducationAssistantBox`
  (uncommitted): a guided education layer over the screening pathway.
- `src/lib/ai-script.ts` ("Sandy" outreach scripting), `src/lib/metrics.ts`
  (program metrics), `src/lib/plain-language-explainer.ts` +
  `AfterVisitExplainerScreen` (discharge-document explainers, gated by
  `server/discharge-explainer-gate.ts`), `server/p3-ingestion-rail.ts` (HIE
  document ingestion), `server/p5-device-rail.ts` (device data rail).

## Candidate next sprints

1. **Program/hub surface** — a separate staff app consuming the same event
   vocabulary (gap list + navigator queue first; Part 2/break-glass walls from
   day one).
2. **Multi-condition protocol packs** — declare colorectal + A1c packs over the
   existing gap/protocol machines; `/screening` becomes `/screening/[pack]`.
3. **Voice drill harness** — port the live-voice drill runner against the
   existing voice gate as a `voice:gate` script beside `crisis:gate`.
