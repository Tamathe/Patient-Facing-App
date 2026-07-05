# Home Health AI Ownership App

Mobile-first v0.1 prototype for patient-owned hypertension care at home.

## What it does

- Helps a patient understand a hypertension care plan.
- Logs home blood pressure readings.
- Explains medicines in plain language.
- Captures medication barriers without blame.
- Provides guided AI coaching with safety boundaries.
- Generates a visit-ready Health Brief.
- Provides privacy, export, delete, and audit foundations.

## What it does not do

- It does not diagnose.
- It does not prescribe.
- It does not change medication doses.
- It does not replace urgent or emergency care.
- It does not send health data to an external AI provider by default.

## Local setup

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000/today
```

## Verification

```bash
npm run test
npm run build
npm run test:e2e
```

## AI posture

The app uses a local mock AI provider by default. Real AI provider integration should be treated as a separate integration decision and requires privacy, security, clinical safety, and regulatory review before sending patient health data outside the browser.
