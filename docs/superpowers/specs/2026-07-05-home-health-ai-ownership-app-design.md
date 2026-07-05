# Home Health Ownership AI App - Design Spec

Date: 2026-07-05
Status: approved for implementation planning

## 1. Product Thesis

The app helps patients own the part of healthcare that happens outside the clinic: understanding their condition, following their care plan, tracking meaningful changes, catching problems earlier, and arriving at visits with better information.

The product is EMR-agnostic. It should work if the patient has a portal connection, a PDF, a photo of discharge instructions, a medication bottle, a home blood pressure reading, or only a memory of what the clinician said.

The core loop:

1. Capture care context.
2. Explain it in plain language.
3. Turn it into a home plan.
4. Help the patient follow the plan.
5. Notice changes or barriers.
6. Prepare a useful summary for the next human care interaction.

The app is not an AI doctor. It explains, coaches, organizes, reminds, summarizes, and routes to care. It does not diagnose, prescribe, change medications, or independently make treatment decisions.

## 2. Recommended First Wedge

The first wedge should be hypertension ownership plus medication understanding and visit prep.

Why hypertension:

- It is common and expensive.
- It is measurable at home.
- Patients often feel fine, so education and adherence matter.
- Poor control leads to preventable acute events.
- Blood pressure readings are easy to trend and explain.
- It creates a clean first product loop without requiring deep EMR integration.

The initial user is an adult primary-care patient with elevated or uncontrolled blood pressure who needs help understanding readings, taking medicines, detecting barriers, and preparing for follow-up visits. The product should also support a caregiver helping that patient, but caregiver workflows are secondary in v0.1.

## 3. Product Principles

1. Patient-owned, not provider-surveillance-oriented.
2. Home-first, not clinic-first.
3. Plain language before charts.
4. Care plan before generic advice.
5. Fewer, better prompts instead of engagement tricks.
6. Trustworthy uncertainty: show what is confirmed, inferred, or needs review.
7. Escalate safely when symptoms, readings, or medication issues may require clinical attention.
8. Never shame the patient for missed readings, missed doses, confusion, cost, fear, or side effects.

## 4. Primary Surfaces

### Today

The home screen shows the next few things that matter now.

Examples:

- Check blood pressure.
- Take morning medicine.
- Recheck a high reading after resting.
- Confirm why a medicine was missed.
- Prepare questions for tomorrow's visit.
- Review a new instruction from an uploaded document.

The Today screen should show no more than three priority items plus a large capture/log action.

### My Plan

My Plan is the plain-language care plan.

It contains:

- What I am managing.
- Why it matters.
- My current care goals.
- What I do at home.
- What numbers I watch.
- My medication plan.
- When I should call for help.
- What my next visit is for.

The plan is assembled from clinician instructions, uploaded documents, patient-entered details, and confirmed AI extraction. Patient-specific thresholds must come from clinician-authored instructions or explicitly labeled standard education.

### My Numbers

My Numbers lets the patient log and understand health signals.

v0.1 supports:

- Systolic and diastolic blood pressure.
- Pulse.
- Time of day.
- Measurement context, such as before medicine, after medicine, after coffee, after resting, or during symptoms.
- Free-text note.

The app should explain numbers in relation to the patient's own plan and recent pattern.

Example:

> This reading is higher than your recent morning pattern. One high reading can happen. Rest quietly for 5 minutes and recheck. If readings stay above the call threshold in your plan, the app can help you contact your care team.

### My Medicines

My Medicines is the patient's understood medication list.

Each medicine card includes:

- What this medicine is for.
- What it helps prevent.
- How it works in plain language.
- How the patient takes it.
- What changed recently.
- Common side effects worth asking about.
- What not to stop suddenly without asking.
- Refill and cost concerns.
- "I am not taking this because..." barrier capture.

The barrier feature is core. It should include choices like forgot, ran out, cost, side effects, confused, scared, pharmacy issue, and does not feel necessary.

### My Visits

My Visits turns home experience into better care conversations.

Before a visit, AI creates a patient-controlled Health Brief:

- What changed since last visit.
- Recent home readings.
- Medication adherence and barriers.
- Symptoms or side effects.
- Recent documents or instructions.
- Questions the patient wants answered.
- What the patient wants help with.

After a visit, AI turns instructions into a follow-up checklist.

## 5. AI Architecture

The AI layer has three jobs.

### Interpreter AI

Interpreter AI turns medical information into patient-understandable language.

Inputs:

- Uploaded documents.
- Visit summaries.
- Discharge instructions.
- Medication lists.
- Patient notes.
- Home readings.
- Manually entered care-plan details.

Outputs:

- Plain-language explanation.
- Extracted instructions.
- Medication purpose summary.
- Follow-up checklist.
- Questions to ask.
- Confidence and source citations.

Interpreter AI should answer from patient-specific confirmed facts first, then from the care plan, then from general health education. It should clearly label general education.

### Coach AI

Coach AI helps the patient follow the plan day to day.

Allowed coaching:

- Remind the patient to log a reading.
- Explain why a medication matters.
- Ask what got in the way.
- Encourage rechecking a reading according to the plan.
- Help prepare a message or question for the care team.
- Prompt care-seeking when a plan-defined threshold, warning symptom, or conservative escalation rule applies.

Blocked coaching:

- Diagnose the patient.
- Tell the patient to start, stop, or change a medication.
- Reassure the patient that a concerning symptom is harmless.
- Override clinician instructions.
- Invent individualized thresholds.

### Compiler AI

Compiler AI creates summaries for other humans.

Outputs:

- Visit prep brief.
- Caregiver update.
- Clinician share packet.
- Medication concern summary.
- Home readings trend.
- "What changed since last visit" summary.

Every generated summary should show which facts are confirmed, patient-reported, imported, or inferred.

## 6. Conversational AI Design

The app should not start with an open-ended chat box. It should offer conversation modes that match patient intent.

Modes:

- Explain this.
- Help me do today.
- Why does this matter?
- What should I ask?
- I am having trouble.
- Prepare for my visit.
- Summarize for someone.

Example conversations:

Patient: Why am I taking lisinopril?

Assistant: Your plan says lisinopril is for blood pressure. Blood pressure medicine lowers pressure inside your blood vessels over time, which can reduce the chance of stroke, heart attack, kidney problems, and heart strain. You may not feel different when it is working. Do not stop or change the dose without asking your clinician.

Patient: My blood pressure was 151 over 92. What does that mean?

Assistant: That is higher than your recent morning readings. One high reading can happen. Sit quietly for 5 minutes, keep both feet on the floor, and recheck. If readings stay above the call threshold in your plan, I can help you prepare a message for your clinic.

Patient: I stopped taking it because it made me dizzy.

Assistant: Dizziness is worth telling your care team about, especially after a medication change. I cannot tell you whether to stop or change the dose, but I can help you write a short message with when the dizziness started, your recent readings, and which doses you missed.

## 7. AI-Powered Instructions

The app should translate clinical instructions into home actions.

Raw instruction:

> Monitor BP. Continue medication. Follow up in 4 weeks.

Patient-facing plan:

- Check blood pressure in the morning before coffee.
- Sit quietly for 5 minutes first.
- Log the reading in the app.
- Take blood pressure medicine as prescribed.
- Write down side effects or missed doses.
- Bring 2 weeks of readings to the follow-up visit.
- Call sooner if your plan's call threshold is met or if you have warning symptoms.

Each instruction should have:

- Source.
- Confidence.
- Patient confirmation status.
- Reminder behavior.
- Escalation behavior.

## 8. Data Model Concept

The product should separate evidence, facts, plans, and AI outputs.

Core objects:

- `patient_profiles`: identity, preferences, language, consent settings.
- `care_context_items`: uploaded documents, photos, portal imports, manual entries.
- `extracted_facts`: dates, medicines, readings, instructions, thresholds, clinician names, appointment details.
- `confirmed_facts`: patient-confirmed or clinician-sourced facts used by the app.
- `care_plans`: condition-specific home plans with goals, routines, thresholds, and escalation rules.
- `medications`: patient-understood medication list with source and adherence barriers.
- `home_readings`: blood pressure and pulse logs with context.
- `tasks`: readings, medication prompts, follow-ups, document confirmations, visit-prep prompts.
- `ai_messages`: conversational history with source references and safety classification.
- `health_briefs`: shareable visit or caregiver summaries.
- `consent_grants`: time-limited sharing permissions.
- `audit_events`: imports, AI summaries, shares, views, revocations, deletions.

Design rule: unconfirmed extraction should not silently become patient truth. The app can say "I found this in your document. Is it right?"

## 9. Data Flow

### Document or Instruction Intake

1. Patient uploads, photographs, forwards, connects, or manually enters care context.
2. The app stores the original item securely.
3. OCR and AI extraction identify medicines, instructions, readings, appointments, thresholds, and warning signs.
4. High-risk fields require confirmation before they affect reminders or coaching.
5. Confirmed facts update My Plan, My Medicines, My Numbers, and My Visits.

### Daily Use

1. Today screen picks the highest-value next action.
2. Patient logs BP, medication status, symptom, or barrier.
3. AI explains the entry against the patient's plan and recent pattern.
4. If escalation criteria are met, the app helps route to the care team or emergency guidance.
5. Otherwise, the app stores the entry and updates trends.

### Visit Prep

1. App asks a short pre-visit check-in.
2. Compiler AI summarizes readings, meds, symptoms, barriers, and questions.
3. Patient reviews and edits the Health Brief.
4. Patient can share, print, export, or show it on the phone.

## 10. Safety and Regulatory Posture

This design intentionally starts in a lower-risk patient-support lane:

- Education.
- Care-plan translation.
- Patient-entered tracking.
- Barrier detection.
- Summaries.
- Visit preparation.
- Escalation based on clinician-authored plan details or conservative, clearly labeled safety guidance.

The app should avoid autonomous patient-specific treatment recommendations unless reviewed through a formal regulatory and clinical safety process.

Safety requirements:

- Display source references for patient-specific claims.
- Label AI-generated education.
- Require confirmation for medications, thresholds, and follow-up dates extracted from documents.
- Use a clinical escalation classifier for symptoms, very high or very low readings, side effects, and medication stoppage.
- Route emergencies to emergency services guidance.
- Keep a red-team suite for unsafe advice requests.
- Log all AI outputs and important user corrections.
- Maintain versioned prompts, retrieval sources, model versions, and evaluation results.

External reference points current as of 2026-07-05:

- FDA Clinical Decision Support Software guidance, January 2026: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
- FDA Artificial Intelligence in Software as a Medical Device: https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-software-medical-device
- ONC HTI-1 final rule algorithm transparency: https://healthit.gov/regulations/hti-rules/hti-1-final-rule/
- HHS resources for mobile health app developers: https://www.hhs.gov/hipaa/for-professionals/special-topics/health-apps/index.html

## 11. Privacy and Trust

The product handles sensitive health data and should behave like trust is the main feature.

Requirements:

- Minimal data collection.
- Plain-language consent.
- Time-limited sharing.
- One-tap revocation.
- Patient-visible access log.
- No advertising or data monetization.
- No hidden tracking of sensitive health behavior.
- Export and deletion path from day one.
- Separate caregiver access from patient ownership.
- Clear warnings when sharing health information outside the app.

If the product partners with covered entities, payers, clinics, or health systems, the HIPAA business associate posture must be reviewed. If the product is direct-to-consumer, HIPAA may not cover all app-held health data, so privacy commitments and FTC/HHS health app guidance still matter.

## 12. MVP Scope

v0.1 should include:

- Mobile web app.
- Patient profile.
- Manual BP logging.
- Medication list.
- Medication explanation cards.
- Barrier capture.
- Basic care-plan builder.
- Upload or photo intake for instructions.
- AI explanation of uploaded instructions.
- Today action feed.
- Visit prep Health Brief.
- Caregiver or clinician share link/export.
- AI safety boundaries.
- Audit log foundation.

v0.1 should not include:

- Diagnosis assistant.
- Medication dose adjustment.
- EMR writeback.
- Automated clinician messaging.
- Continuous device monitoring.
- Payer claims ingestion.
- Broad chronic-care support across many conditions.
- Native mobile app dependency.
- Provider dashboard.

## 13. Phasing

### v0.1: Hypertension Home Ownership

Goal: prove patients can understand BP, medicines, barriers, and visit prep better with AI support.

Core features:

- BP logging.
- Medication understanding.
- Care-plan translation.
- Barrier capture.
- Today feed.
- Health Brief.

### v0.2: Stronger Care Context

Goal: improve intake and plan quality.

Add:

- Document OCR.
- Portal PDF upload.
- More robust instruction extraction.
- Patient confirmation cards.
- Spanish explanation mode.
- Better caregiver sharing.

### v1: Home Care Continuity

Goal: become useful across repeated care interactions.

Add:

- Longitudinal timeline.
- Multi-condition support.
- Refill and cost barriers.
- Wearable/device import where useful.
- Shareable care packets.
- Human review workflow for high-risk extractions.

### v2: Partner and Clinical Workflow Layer

Goal: connect patient-owned home context back into care systems.

Add only after v1 proof:

- Clinic-facing summary inbox.
- Care manager workflow.
- EMR/FHIR import.
- Structured export.
- Program outcome metrics.
- Formal clinical safety governance.

## 14. Success Metrics

Activation:

- Patient creates a care plan.
- Patient logs first BP reading.
- Patient confirms at least one medication purpose.

Engagement:

- Two or more BP readings in first 14 days.
- One barrier captured.
- One AI explanation viewed or heard.

Clinical-process value:

- Health Brief generated before visit.
- Patient shares or uses Health Brief.
- Medication discrepancy or barrier identified.
- Follow-up action completed.

Safety and trust:

- Unsafe advice rate.
- Source citation accuracy.
- Extraction correction rate.
- Escalation appropriateness.
- Deletion/export completion rate.

Do not optimize for daily active users. Silence is appropriate when nothing needs attention.

## 15. Open Founder Decisions Before Build

The spec recommends these defaults, but the founder should explicitly approve them:

1. First wedge: hypertension ownership.
2. First AI posture: care-plan interpreter first, guided conversational coach second.
3. First user: adult patient managing uncontrolled or elevated BP.
4. Privacy promise: no ads, no data monetization, patient-controlled sharing.
5. Risk boundary: no diagnosis, no medication changes, no autonomous treatment recommendations in v0.1.
6. Platform: mobile web first.
7. Distribution: direct patient pilot, primary-care partner pilot, or caregiver-led pilot.

## 16. Review Checklist

This spec is ready for implementation planning when:

- The first wedge is approved.
- The AI safety boundary is approved.
- The MVP scope is approved.
- The privacy promise is approved.
- The first pilot population is chosen.
