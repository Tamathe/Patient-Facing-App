# Household Paperwork Coach — Design Brief (v0.1, pre-decision draft)

Date: 2026-07-03
Status: synthesis of a six-lens design analysis (product/UX, architecture, AI pipeline, trust/privacy/compliance, GTM/expert-side, MVP scoping) plus an adversarial completeness critique. Positions below are recommendations, not decisions — the Open Questions section lists what must be answered before building.

---

## 1. Product thesis — the loop that IS the product

**Snap a photo of a scary letter → get back (a) a plain-language explanation, (b) the extracted deadline, (c) a checklist of what to gather → SMS reminders before the deadline.**

Everything else in the brief — vault, timeline, household profile, pattern detection, expert dashboard — is a byproduct or later layer of this loop. If this loop doesn't retain families, nothing downstream matters.

The competitor is not another app. It is the shoebox plus a helpful relative. The bar: snap-to-answer in under 60 seconds, before account creation, with zero form-filling.

Corollary: usage is **episodic by design**. A household may legitimately need the app three intense weeks a year. Never measure DAU; measure "snapped a second document within 14 days," reminder-to-action rate, and extraction accuracy. Silence when nothing is due is a feature.

---

## 2. Key design decisions (recommended positions)

| # | Decision | Recommendation | Rationale |
|---|----------|----------------|-----------|
| 1 | Home screen | "Your next thing" action feed (max 3 items) + oversized camera button. Chat is contextual, attached to documents/tasks — not a destination tab. | Open-ended chat = blank-page paralysis for stressed, low-digital-confidence users; a dashboard restates the overwhelm they came to escape. |
| 2 | Information architecture | Organize around **"situations"** ("2025 Taxes," "SNAP renewal," "Maya's school forms"), not features. Checklist, docs, timeline, reminders live inside a situation. Global vault/timeline are secondary search views. | Progress reads as "SNAP renewal: 4 of 6 done." The situation is also exactly the unit the expert side consumes and the unit of sharing consent. |
| 3 | Platform (v0.1) | Mobile web (PWA) + SMS reminders. No app store. Phone-number auth (see recovery risk, §12). Native Android only if capture quality or notification delivery measurably blocks. | A link works instantly in a benefits-office waiting room; install friction is an activation tax; SMS — not push — is the reminder channel this population reads. Start Twilio A2P 10DLC registration in week 1 (approval takes weeks). |
| 4 | Ingestion (v0.1) | Camera/upload only. Email forward-to-address in v1.5 **with sender verification + quarantine for unknown senders**. No OAuth email, no payroll/portal aggregators (Argyle/Pinwheel/Plaid) until retention is proven. | Paper mail is the actual input; connectors are months of brittle work with weak coverage for gig/cash/state-benefits income, plus a trust cliff and subpoena-surface expansion. A leaked forwarding address is a document-poisoning vector — quarantine is non-negotiable. |
| 5 | Extraction engine | **Hybrid**: layout-aware OCR (Textract/Azure DI) always runs for word-level bounding boxes + vision LLM (Claude Sonnet) as the extractor, per-doc-type JSON schemas via structured output. Haiku-class pass for classification. | You cannot ship the confirmation UX without OCR geometry ("we read: *Due March 14* [image crop]"), and "extracted value must match an OCR token span" is the cheapest, strongest anti-hallucination check. OCR ≈ $1.50/1k pages. |
| 6 | Deadlines & tasks | Deterministic, versioned **obligation templates** (doc_type + jurisdiction → required items, tasks, reminder schedule). LLM only classifies and extracts parameters. Action-driving fields (dates, amounts, case numbers) are **confirm-first**: auto-accept only on vision+OCR agreement + validator pass; everything else gets a one-tap crop-snippet confirmation, capped per session to avoid confirmation fatigue. | A fabricated deadline that costs a family SNAP is the existential failure mode. This is the single most important reliability decision in the product. |
| 7 | Silent-failure defense | Every ingested document must end in a **visible disposition**. "Unknown/unreadable" is a first-class state ("We couldn't fully read this — here's what to check") with a review queue. | The catastrophic case is a renewal letter misclassified as a receipt: no deadline extracted, no confirmation shown, no reminder fired, benefits lost — with the system never appearing to err. Eval classification **recall** on deadline-bearing notice types (≥99%), not just extraction precision. |
| 8 | Assistant grounding | Verified-fact-store-first: confirmed extractions are the source of truth for user-specific answers, cited back to doc/page/region with tappable snippets. RAG over chunks only for long-tail "what does paragraph 3 mean." General procedural knowledge gets a visually distinct "general info" treatment and may never state user-specific facts. | Once a user confirms "due March 14," the assistant must never re-derive a different date from a fuzzy re-read. |
| 9 | Explain/advise line | The assistant **explains, extracts, lists, reminds, translates, and routes to humans**. Hard blocks: eligibility determinations ("you qualify"), tax positions (filing status, which credits), and any immigration guidance whatsoever. Enforced in layers: prompt + output speech-act classifier + conditional-framing rewriter + mandatory route-to-human CTA on eligibility surfaces + red-team suite as a launch gate. | Prompt-only guardrails erode under multi-turn pressure from stressed users. This is UPL / tax-advice / notario-statute liability, not tone. Split-brain: analysis and flags go to the expert dashboard; logistics go to households. |
| 10 | Eligibility detection | Rules engine (adopt **PolicyEngine**), never LLM inference. LLM maps document facts → engine inputs and renders outputs in plain language. Scope: ~5 programs (SNAP, Medicaid, EITC/CTC, LIHEAP, WIC) in launch state(s), screening fidelity, always labeled "possible — confirm with [navigator]." **Blocked on counsel**: §7216 may prohibit feeding tax-derived facts into any eligibility nudge at all. | 50-state rules maintenance is a policy-analysis problem, not ML. Defer to v2 regardless. |
| 11 | Gamification | **Reject streaks/points/badges (explicit delta from the brief).** Keep two mechanics: per-situation progress ("4 of 6") and a weekly-wins recap. The reward is closure: "SNAP renewal done. Nothing due until May." | Streaks punish families for having nothing due; points on eviction paperwork read as condescending or dark-pattern engagement farming. Never reward disclosure ("upload more docs") — FTC dark-pattern territory. |
| 12 | Identity model | Individual accounts inside a household container from day one. Roles: owner / adult member / helper (task-scoped delegation) / teen (own docs only). Per-document visibility: household / just me / shared-with-expert. PIN per profile + quick-hide (shared phones are the norm). | Retrofitting identity is brutal; shared logins are unsafe (estranged partners, financial abuse, teens who shouldn't see eviction notices). Also required for coherent consent + audit. |
| 13 | Expert access | User-initiated, **per-situation/per-engagement, time-boxed, one-tap revocable** (revocation kills cached summaries too). Dashboard-only: no vault browsing, no bulk export/download in v1. Credential verification (PTIN/EFIN, navigator certification) + data-use agreement. Append-only access log **shown to the household** ("Maria at Riverside Legal Aid viewed your documents Tuesday"). | Standing vault access inverts the trust model into surveillance. Coarse whole-household grants likely fail §7216's purpose-specific consent if preparers are in the pilot. Per-category micro-scoping is a v2 tarpit — per-situation is the right grain. |
| 14 | SSNs | Do not store full SSNs. Detect + redact at ingestion (before DB or any LLM call); keep encrypted last-4 only. Note the residual: full values persist inside stored original images (needed for crop-snippet provenance) — the honeypot shrinks but doesn't vanish; document this tension honestly. Never require photographing an SSN card; last-4 manual entry covers checklist needs. | No v1 workflow files anything requiring a full SSN. Dropping them defuses most breach-notification triggers and the strongest subpoena magnet. |
| 15 | Security/compliance baseline | Build to the **FTC Safeguards Rule (GLBA)** as the spec: WISP, named security owner, MFA, encryption, incident-response plan, annual pen test (scale gate). Field-level envelope encryption (KMS) for sensitive columns, accessed only via a service layer that writes to the audit log. Zero-data-retention + no-training terms with the model vendor. Treat every uploaded PDF as hostile input (prompt injection can poison expert summaries). MA 201 CMR 17.00 makes a WISP mandatory the day one MA resident signs up. | Preparer customers are GLBA-covered and must flow obligations down contractually anyway; arguing non-coverage buys nothing. |
| 16 | Legal-process & immigration posture | Publish before launch: warrant-for-content, user notice unless gagged, no voluntary disclosure to immigration enforcement, minimal retention, provable self-serve deletion (docs + derived data + embeddings + expert-side caches + backups ≤35 days). **No immigration-status field, flag, or inference anywhere in the schema.** | For mixed-status and benefits-receiving households this is the adoption prerequisite; immigrant-serving CBOs will diligence it in the first meeting and their requirements are the real spec. It also forecloses data-monetization revenue — decide now. |
| 17 | Language | v0.1: Spanish explanation toggle (LLM, labeled as machine translation), side-by-side English/Spanish view, per-member language settings. Before CBO-scale launch: human-reviewed Spanish for core flows + top ~20 notice templates; glossary-locked official terminology (agency-published translations); numbers/dates/case numbers copied programmatically, never through generation. | LEP users are least able to catch a mistranslated deadline — translation errors have higher expected harm and usually less eval attention. |
| 18 | GTM wedge | **Expert-initiated distribution, household-first product.** One design-partner org in one state — ideally one that runs both free tax prep (VITA) and benefits navigation (United Way affiliate, food bank with SNAP outreach + VITA site). Tax season = the acquisition event (docs seed the profile); recert reminders = the year-round retention loop. Expert dashboard is **pull, not push**: v1 ships a family-controlled shareable summary link/PDF; build the multi-household dashboard only when partner orgs ask to see many families in one place. | Consumer acquisition in this segment is a scale game Propel already won; trust transfers from the caseworker ("the person at the tax site told me to install this"). Building the dashboard before family retention exists is the most likely way the product dies (two-sided cold start + 6–12 month nonprofit sales cycles). |
| 19 | Positioning vs incumbents | Intake-and-document layer, **not** case management, **not** a referral network. One-click export of the AI summary to Salesforce/Bonterra (PDF/print for everyone else); findhelp API for "local support" CTAs rather than curating a directory. | CBOs already live in a CMS and will reject "yet another portal." findhelp/Unite Us own the referral graph. Killer dashboard feature: the pre-session one-pager (household composition, docs present vs. missing mapped to IRS Form 13614-C, deadlines next 30 days, inconsistency flags). |
| 20 | Revenue | Org SaaS per active household (~$15–40/household/yr), philanthropy-subsidized pilots; map to how orgs get money (VITA grants, state SNAP outreach plans with 50% federal admin reimbursement, Medicaid admin match). Instrument on-time-recert and document-complete-intake rates from day one so outcomes-based contracts (states, health plans; post-Medicaid-unwinding procedural-churn money) become possible later. Never consumer subscription for this segment; never data monetization. | Per-seat pricing fails (orgs flex volunteers seasonally). Benefits Data Trust — best-funded org ever in this space — shut down in 2024; plan a philanthropy bridge of 2+ years. |

---

## 3. Architecture sketch

**Stack** (small team, near-zero idle cost): TypeScript monolith — Next.js (App Router) on Vercel, Postgres (Neon/Supabase) + Prisma, Inngest (durable jobs + cron), Clerk or Supabase Auth, Postmark (email in/out), Twilio (SMS), private object storage (Supabase Storage / S3+R2) with short-lived signed URLs only. Postgres RLS as defense-in-depth behind an app-layer consent-checking repository — the consent join is product logic and belongs in testable code; RLS is insurance.

**Data model — separate EVIDENCE from FACTS:**

- `households` → `members` (individual auth identities, role)
- `documents` (household_id, member_id?, doc_type, storage_key, status, disposition) — every doc ends in a visible disposition
- `extracted_fields` (document_id, key, value, confidence, page, bbox, source_snippet) — raw evidence with provenance
- `household_facts` (curated values; each references the extracted_field that supports it) — unconfirmed extraction never silently becomes profile truth
- `obligations` (household_id, type e.g. `snap_recert_2026`, jurisdiction, due_date, status) → `required_items` (requirement, satisfied_by_document_id?) → `tasks` (due_at, cta_type, status). Checklist UI = required_items where satisfied_by is null; "missing W-2" detection is a query, not an ML feature.
- `obligation_templates` (versioned, effective-dated; doc_type + jurisdiction → items/tasks/reminder schedule) — **this library is the real product and it is content ops, not code**
- `expert_orgs` → `expert_users`; `consent_grants` (household_id, org_id, situation/engagement scope, granted_at, expires_at, revoked_at) — the ONLY path expert queries reach household data
- `access_log` (append-only, user-visible) — build day one; impossible to retrofit
- `reminders` derived from confirmed deadlines; Inngest cron dispatches (SMS/email; push later)

**Ingestion pipeline:** upload/photo → original to private storage → `documents` row (processing) → Inngest job: normalize (HEIC→JPEG, PDF→page images) → OCR pass (geometry) → Haiku classify (type, agency, state, language; ~100-type taxonomy) → Sonnet vision extract against typed schema → deterministic validators (date plausibility windows, W-2 box arithmetic, ID format checks, cross-doc consistency) → confidence gate: triple-agreement auto-accepts; everything else queues a crop-snippet confirmation card. Target < 60s upload-to-checklist. Cost target ≤ $0.10/document all-in (Haiku classify + Sonnet extract + prompt caching + Batch API for reprocessing).

**Notification policy:** deadline- and action-anchored only (~2/week outside crunch), escalating channel (push → SMS → "want us to connect you with a person?"), every notification says why it fired, zero "we miss you" messages ever. **Minimize what the notification itself discloses** — lock-screen previews and SMS must not reveal benefits status (shared/abuser-visible phones, recycled numbers).

---

## 4. AI safety & eval gates

- Golden set: 500–1,000 consented real documents (via partner org) + synthetically degraded scans, stratified by type × state × language × photo quality. Severity-weighted field metrics.
- Launch gates (scale, not v0.1 — see phasing): ≥99.5% precision on auto-accepted deadlines/amounts; ≥99% classification recall on deadline-bearing notice types; ≥98% citation validity; 0 advice violations on a multi-turn red-team suite.
- v0.1 gate instead: **concierge QA — a human reviews 100% of extractions before any reminder is armed** for the first 1–3 months. Measures the true error rate on messy photographed notices and prevents a catastrophic wrong-deadline incident during the trust-building window.
- User corrections are the data flywheel and drift alarm: per-doc-type correction-rate spike = a state redesigned its notice → auto-flag for schema review. Track blind-confirm behavior (time-to-tap < ~1.5s) as evidence the confirmation layer is degrading into a click-through.
- Expert summaries: structured facts table + narrative, every line cited, unverified extractions flagged "not yet confirmed by household," and a **"missing / low-confidence" section that leads**. Any "summary caused a wrong action" event is a zero-tolerance incident. Guard against expert over-trust: a preparer importing a misextracted income figure converts an app bug into a real IRS problem.

---

## 5. Phasing

**v0.1 (3–5 weeks, 1–2 engineers, 15–20 families via one partner org, one state):**
Mobile web, phone auth, camera upload, hybrid extract, plain-language explanation (content schema: *What this is / What happens if you do nothing / What to do next / How long it takes*; 6th-grade reading level; read-aloud), one-tap deadline confirmation with crop snippet, SMS reminders T-14/T-7/T-2, Spanish explanation toggle, concierge QA on everything. The week-2 wow: a proactive SMS that knows something the family forgot ("Recert due in 10 days; you still need your last two pay stubs") — enforce the invariant that every ingested document produces at least one future-dated touchpoint.

**v1 (2–3 months):** searchable vault, renewal calendar with projected recert dates, family-controlled shareable summary (link/PDF) — this tests the entire expert value prop with zero expert-side auth or sales cycle, human-reviewed Spanish core flows, deadline-confidence tooling, real deletion path, access log UI, email forward-to-address with quarantine.

**v2 (a quarter, only after family retention is proven):** expert dashboard as an inbox of family-shared summaries sold to the partner org on time-saved-per-intake; consent grants + credentialing + audit surface; PolicyEngine eligibility flags (expert-side first, counsel permitting); Salesforce/Bonterra export; payroll aggregator only if retention data demands it.

**Explicitly never-in-v1:** native apps, OAuth email, portal/payroll connectors, eligibility determinations, streaks/points/badges, form-filling/e-sign/e-filing, household↔expert chat, referral network, full UI i18n, national scope.

---

## 6. Explicit deltas from the original brief (founder sign-off needed)

1. **Gamification**: brief asks for streaks/points/badges; analysis unanimously rejects them (progress + closure + weekly wins only).
2. **Connected accounts**: brief lists them as core ingestion; all lenses cut them from v1 (camera + later email-forwarding instead).
3. **Scope**: brief implies national, multi-domain (tax + benefits + school + housing + insurance); analysis cuts to one state, one-two verticals (tax intake + benefits renewals), with school/housing/insurance as profile breadth added later. The obligation-template library scales linearly with programs × states and is the largest ongoing cost.
4. **Expert dashboard timing**: brief presents it as core; analysis makes it v2, pulled by demand, with the shareable summary as the v1 bridge.

---

## 7. Top risks

1. **Wrong-deadline harm** — existential; mitigated structurally (confirm-first, concierge, provenance, conservative early reminders), never by disclaimer.
2. **Silent recall failure** — misclassified renewal letter = invisible harm; visible dispositions + recall evals.
3. **Consent bug leaks a household to the wrong org** — single audited code path + RLS backstop + access log.
4. **§7216 criminal exposure** — bundled consents, tax data feeding nudges/marketing; architecture-level, needs counsel.
5. **Trust cliff / dossier fear** — asking for too much too early kills activation; a breach or subpoena story ends the product community-wide.
6. **Confirmation fatigue** → blind-tapping turns the safety layer into theater; cap and batch confirmations, monitor time-to-tap.
7. **Episodic-use misdiagnosis** → DAU panic → engagement features that read as "Duolingo for poverty."
8. **Nonprofit sales economics** — $10k–50k budgets, grant cycles, BDT's 2024 shutdown; philanthropy bridge required.
9. **Content-ops rot** — templates/rules/notice formats churn constantly; unstaffed content operation = quiet decay.
10. **Platform absorption** — Propel/Intuit/Code for America can each ship the adjacent 80%; the moat is the consented, longitudinal, cross-domain household profile shared across multiple helpers.

## 8. Gaps the critique surfaced (unowned spec items)

- **Human support ops**: who answers the phone (channels, hours, languages, tax-season surge)? Support cost/household will likely rival LLM cost; first question a CBO director asks.
- **Harm redress**: in-product "this was wrong" report; recall-style proactive notification when a systematic bug armed wrong deadlines; correcting already-shared expert summaries; appeal/fair-hearing help; E&O insurance; partner-contract remediation terms.
- **Household lifecycle**: divorce/contested access, death of owner, custody changes, teens aging out, splits/merges, interstate moves (invalidate every jurisdiction-bound template and armed reminder).
- **Account recovery**: prepaid phone-number recycling → lockout AND takeover risk AND SMS leakage to a stranger; identity recovery for users without stable email/phone is undesigned.
- **Loop closure**: the app can't observe whether a renewal was actually submitted/approved; completion-confirmation UX + org outcome data-sharing needed (also required for the "reduced procedural churn by X%" metric the GTM depends on).
- **Wind-down obligation**: export guarantees, sunset notice period, data escrow — families may hold their only copies here; CBOs burned by vendor shutdowns will ask.
- **Equity bugs in pattern detection**: Hispanic double surnames and transliteration variance will systematically false-positive "name mismatch" flags; monitor extraction accuracy by language/demographic strata.
- **Accessibility**: WCAG/508/VPAT is a procurement gate for government-adjacent partners; also SSI/SSDI, Medicare, VA, unemployment, child support are huge paperwork domains absent from scope discussion.
- **Vendor risk**: single-LLM-vendor dependency; SMS carriers filtering benefits/deadline texts as phishing even after 10DLC; app-store sensitive-data policies (if native later).

---

## 9. Open questions (prioritized — answers change what gets built)

1. **Design partner**: Do you have a committed org today — VITA/tax-prep or benefits-navigation, which state, able to enroll 15 families within ~60 days? (Resolves the wedge, launch state, document corpus, and dashboard timing. If no: the first four weeks are spent getting one, not writing code.)
2. **Who pays + data promise**: Orgs (B2B2C, grant-bridged) or consumers (which shifts the segment to sandwich-generation life-admin — a different product)? Will you commit publicly and permanently to no data monetization, no ads, no undisclosed referral fees?
3. **Launch scope**: Which state(s), which programs, which languages, concretely? (Biggest cost lever: templates, schemas, eval sets, rules coverage, localization all scale with it.)
4. **Legal line (needs counsel)**: Will the product ever prepare/pre-fill/transmit return data? Can tax-derived facts feed eligibility nudges at all under §7216's "use" restriction? Exactly what may the assistant say to households vs. experts?
5. **Immigration/compelled-disclosure posture**: Warrant-for-content, notice unless gagged, no immigration-status data anywhere, minimal retention, provable deletion — committed publicly, accepting the foreclosed revenue models?
6. **Funding structure**: Venture-paced or philanthropy-bridged 2–3 years? Is a seasonal-peak business acceptable, or is year-round engagement a thesis requirement?
7. **Harm & support commitments**: How long does 100%-human review run? What staffed bilingual support exists at launch? What remediation (appeals help, insurance, contract terms) when the app is wrong?
8. **Content ops ownership**: Who on the team owns benefits-policy content — maintaining templates and notice schemas as states change rules? Does that expertise exist in-house?
9. **Expert model**: Curated/vetted marketplace or bring-your-own professional? Read-only + notes, or act-on-behalf (uploads, edits) — which roughly doubles the permission surface?
10. **Outcome capture**: How does the product learn a renewal was actually submitted and approved/denied — household confirmation, org data-sharing, or both?
