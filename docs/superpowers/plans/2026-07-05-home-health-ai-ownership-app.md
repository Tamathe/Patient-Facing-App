# Home Health AI Ownership App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first v0.1 app that helps an adult patient own hypertension care at home through blood pressure tracking, medication understanding, care-plan translation, AI-guided coaching, and visit prep.

**Architecture:** Build a Next.js App Router application with a small domain core, deterministic safety/rules modules, local demo persistence, and a provider-isolated AI layer. The first version runs with a mock AI provider by default, while the interfaces support adding a real protected AI provider after privacy, security, and clinical governance are approved.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Tailwind CSS, Zod, Vitest, React Testing Library, Playwright, lucide-react, localStorage-backed demo repository.

## Global Constraints

- Patient-owned, not provider-surveillance-oriented.
- Home-first, not clinic-first.
- Plain language before charts.
- Care plan before generic advice.
- Fewer, better prompts instead of engagement tricks.
- Show what is confirmed, inferred, or needs review.
- Escalate safely when symptoms, readings, or medication issues may require clinical attention.
- Never shame the patient for missed readings, missed doses, confusion, cost, fear, or side effects.
- The app explains, coaches, organizes, reminds, summarizes, and routes to care.
- The app does not diagnose, prescribe, change medications, or independently make treatment decisions.
- Patient-specific thresholds must come from clinician-authored instructions or explicitly labeled standard education.
- Unconfirmed extraction must not silently become patient truth.
- No advertising or data monetization.
- Mobile web first.
- No external AI calls unless an explicit provider environment variable is configured.

---

## Scope Check

This plan implements the approved v0.1 wedge: hypertension ownership, medication understanding, AI care-plan interpretation, guided coaching, and visit prep. It does not implement EMR writeback, provider dashboards, payer claims ingestion, native mobile apps, broad chronic-care support, or autonomous diagnosis/treatment recommendations.

## File Structure

Create these top-level project files:

- `package.json`: scripts, dependencies, and test commands.
- `tsconfig.json`: strict TypeScript settings.
- `next.config.mjs`: Next.js configuration.
- `postcss.config.mjs`: Tailwind PostCSS setup.
- `tailwind.config.ts`: design tokens and content paths.
- `vitest.config.ts`: unit and component test configuration.
- `playwright.config.ts`: browser test configuration.
- `.env.example`: documented local environment variables.
- `README.md`: local setup, safety posture, and v0.1 scope.

Create these app files:

- `src/app/layout.tsx`: root layout and metadata.
- `src/app/page.tsx`: redirects to the Today surface.
- `src/app/today/page.tsx`: Today screen.
- `src/app/plan/page.tsx`: care plan screen.
- `src/app/numbers/page.tsx`: blood pressure logging and insights.
- `src/app/medicines/page.tsx`: medication ownership screen.
- `src/app/visits/page.tsx`: Health Brief screen.
- `src/app/intake/page.tsx`: care instruction intake and confirmation screen.
- `src/app/chat/page.tsx`: guided AI conversation modes.
- `src/app/privacy/page.tsx`: export, delete, and access log controls.

Create these shared modules:

- `src/domain/types.ts`: canonical domain types.
- `src/domain/schemas.ts`: Zod schemas for validation.
- `src/domain/fixtures.ts`: demo patient, plan, medicines, readings, and intake.
- `src/domain/blood-pressure.ts`: BP interpretation and trend logic.
- `src/domain/tasks.ts`: Today priority task generation.
- `src/domain/safety.ts`: blocked medical advice and escalation checks.
- `src/domain/health-brief.ts`: Health Brief compilation.
- `src/domain/instructions.ts`: instruction extraction result model and confirmation logic.
- `src/domain/audit.ts`: audit event helpers.
- `src/ai/types.ts`: AI provider interfaces and response contracts.
- `src/ai/mock-provider.ts`: deterministic mock AI responses.
- `src/ai/safety-gate.ts`: preflight and postflight safety wrappers.
- `src/ai/prompts.ts`: versioned prompt text for future live provider use.
- `src/state/store.tsx`: React context plus reducer for local demo state.
- `src/state/storage.ts`: localStorage persistence.
- `src/components/app-shell.tsx`: mobile-first navigation shell.
- `src/components/action-card.tsx`: reusable Today item.
- `src/components/source-badge.tsx`: source/confidence display.
- `src/components/bp-log-form.tsx`: BP entry form.
- `src/components/medication-card.tsx`: medication explanation and barrier capture.
- `src/components/health-brief-card.tsx`: visit prep summary.
- `src/components/conversation-panel.tsx`: guided chat UI.
- `src/components/intake-review-card.tsx`: extracted instruction confirmation.
- `src/components/privacy-panel.tsx`: audit/export/delete UI.
- `src/styles/globals.css`: global Tailwind styles.

Create tests:

- `src/domain/*.test.ts`: unit tests for rules, safety, tasks, instruction confirmation, and Health Briefs.
- `src/ai/*.test.ts`: unit tests for mock provider and safety gate.
- `src/state/*.test.ts`: reducer and persistence tests.
- `src/components/*.test.tsx`: component tests for forms and cards.
- `e2e/home-health.spec.ts`: end-to-end happy path.

---

### Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`

**Interfaces:**
- Consumes: none
- Produces: Next.js app shell, strict TypeScript build, test scripts, browser test harness

- [ ] **Step 1: Initialize package scripts and dependencies**

Create `package.json`:

```json
{
  "name": "home-health-ai-ownership-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm run test && npm run build"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 2: Add strict TypeScript and framework config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

- [ ] **Step 3: Add Tailwind and test config**

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#fbfaf7",
        care: "#217c70",
        pulse: "#9d3f31",
        calm: "#d8ece7",
        note: "#f4d06f"
      },
      borderRadius: {
        control: "8px"
      }
    }
  },
  plugins: []
};

export default config;
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
```

- [ ] **Step 4: Add base app files**

Create `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color: #172026;
  background: #fbfaf7;
}

body {
  min-height: 100vh;
  background: #fbfaf7;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

Create `src/app/layout.tsx`:

```tsx
import "@/styles/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Home Health Ownership",
  description: "Patient-owned home care support for blood pressure, medicines, and visits."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/today");
}
```

Create `.env.example`:

```bash
HEALTH_AI_PROVIDER=mock
HEALTH_AI_MODEL=
HEALTH_AI_API_KEY=
```

- [ ] **Step 5: Run foundation checks**

Run: `npm run test`

Expected: PASS with no tests found only if Vitest exits cleanly after setup exists in Task 2. If Vitest fails because setup is missing, continue to Task 2 before re-running full checks.

Run: `npm run build`

Expected: Next.js compiles the empty app.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.ts vitest.config.ts playwright.config.ts .env.example src/app src/styles
git commit -m "chore: scaffold home health app"
```

---

### Task 2: Test Setup and Domain Types

**Files:**
- Create: `src/test/setup.ts`
- Create: `src/domain/types.ts`
- Create: `src/domain/schemas.ts`
- Create: `src/domain/fixtures.ts`
- Test: `src/domain/schemas.test.ts`

**Interfaces:**
- Consumes: project foundation from Task 1
- Produces: `PatientProfile`, `CarePlan`, `Medication`, `HomeReading`, `TaskItem`, `CareContextItem`, `ExtractedFact`, `HealthBrief`, Zod schemas, `demoState`

- [ ] **Step 1: Add test setup**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Define domain types**

Create `src/domain/types.ts`:

```ts
export type EvidenceStatus = "confirmed" | "patient_reported" | "imported" | "inferred" | "needs_review";

export type PatientProfile = {
  id: string;
  name: string;
  preferredName: string;
  language: "en" | "es";
  primaryClinicName: string;
  primaryClinicPhone: string;
};

export type CareGoal = {
  id: string;
  label: string;
  reason: string;
};

export type CarePlan = {
  id: string;
  patientId: string;
  condition: "hypertension";
  plainLanguageSummary: string;
  goals: CareGoal[];
  dailyActions: string[];
  callThresholdSystolic: number | null;
  callThresholdDiastolic: number | null;
  thresholdSource: EvidenceStatus;
  warningSymptoms: string[];
  nextVisitReason: string;
};

export type MedicationBarrier =
  | "forgot"
  | "ran_out"
  | "cost"
  | "side_effects"
  | "confused"
  | "scared"
  | "pharmacy_issue"
  | "does_not_feel_necessary";

export type Medication = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  schedule: string;
  purpose: string;
  preventionBenefit: string;
  safetyNote: string;
  source: EvidenceStatus;
  activeBarriers: MedicationBarrier[];
};

export type MeasurementContext = "morning" | "evening" | "before_medicine" | "after_medicine" | "after_coffee" | "after_resting" | "during_symptoms";

export type HomeReading = {
  id: string;
  patientId: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: string;
  contexts: MeasurementContext[];
  note: string;
};

export type TaskItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  priority: 1 | 2 | 3;
  kind: "reading" | "medicine" | "visit" | "intake" | "privacy";
};

export type CareContextItem = {
  id: string;
  patientId: string;
  title: string;
  rawText: string;
  sourceLabel: string;
  createdAt: string;
};

export type ExtractedFact = {
  id: string;
  contextItemId: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  status: EvidenceStatus;
  sourceSnippet: string;
};

export type AiMode = "explain" | "today" | "why" | "ask" | "trouble" | "visit" | "summarize";

export type AiMessage = {
  id: string;
  mode: AiMode;
  role: "patient" | "assistant";
  content: string;
  createdAt: string;
  safety: "allowed" | "escalate" | "blocked";
  sources: string[];
};

export type HealthBrief = {
  id: string;
  patientId: string;
  generatedAt: string;
  sections: Array<{
    title: string;
    items: string[];
    status: EvidenceStatus;
  }>;
};

export type AuditEvent = {
  id: string;
  patientId: string;
  action: "created" | "updated" | "ai_generated" | "shared" | "exported" | "deleted";
  label: string;
  createdAt: string;
};

export type AppState = {
  patient: PatientProfile;
  carePlan: CarePlan;
  medications: Medication[];
  readings: HomeReading[];
  tasks: TaskItem[];
  contextItems: CareContextItem[];
  extractedFacts: ExtractedFact[];
  aiMessages: AiMessage[];
  auditEvents: AuditEvent[];
};
```

- [ ] **Step 3: Add Zod schemas**

Create `src/domain/schemas.ts`:

```ts
import { z } from "zod";

export const bpReadingInputSchema = z.object({
  systolic: z.coerce.number().int().min(70).max(260),
  diastolic: z.coerce.number().int().min(40).max(160),
  pulse: z.coerce.number().int().min(30).max(220).nullable(),
  contexts: z.array(z.enum(["morning", "evening", "before_medicine", "after_medicine", "after_coffee", "after_resting", "during_symptoms"])).min(1),
  note: z.string().max(280)
});

export const medicationBarrierSchema = z.enum([
  "forgot",
  "ran_out",
  "cost",
  "side_effects",
  "confused",
  "scared",
  "pharmacy_issue",
  "does_not_feel_necessary"
]);

export const careContextInputSchema = z.object({
  title: z.string().min(2).max(80),
  rawText: z.string().min(10).max(5000),
  sourceLabel: z.string().min(2).max(80)
});
```

- [ ] **Step 4: Add demo fixtures**

Create `src/domain/fixtures.ts`:

```ts
import type { AppState } from "./types";

export const demoState: AppState = {
  patient: {
    id: "patient-1",
    name: "Jordan Taylor",
    preferredName: "Jordan",
    language: "en",
    primaryClinicName: "Bluegrass Primary Care",
    primaryClinicPhone: "555-0142"
  },
  carePlan: {
    id: "plan-1",
    patientId: "patient-1",
    condition: "hypertension",
    plainLanguageSummary: "You are working on keeping blood pressure in a safer range at home so your heart, brain, and kidneys have less strain over time.",
    goals: [
      {
        id: "goal-1",
        label: "Understand my blood pressure",
        reason: "Knowing your usual range helps you and your care team spot changes earlier."
      },
      {
        id: "goal-2",
        label: "Take medicines with confidence",
        reason: "Blood pressure medicine can help even when you do not feel symptoms."
      }
    ],
    dailyActions: ["Check blood pressure in the morning before coffee.", "Take blood pressure medicine as prescribed.", "Write down dizziness, swelling, chest pain, or missed doses."],
    callThresholdSystolic: 160,
    callThresholdDiastolic: 100,
    thresholdSource: "patient_reported",
    warningSymptoms: ["chest pain", "shortness of breath", "weakness on one side", "new confusion", "severe headache"],
    nextVisitReason: "Review two weeks of home blood pressure readings and medication barriers."
  },
  medications: [
    {
      id: "med-1",
      patientId: "patient-1",
      name: "Lisinopril",
      dose: "10 mg",
      schedule: "Once daily",
      purpose: "Helps lower blood pressure.",
      preventionBenefit: "Lower blood pressure can reduce the chance of stroke, heart attack, kidney problems, and heart strain.",
      safetyNote: "Do not stop or change the dose without asking your clinician.",
      source: "patient_reported",
      activeBarriers: []
    }
  ],
  readings: [],
  tasks: [],
  contextItems: [],
  extractedFacts: [],
  aiMessages: [],
  auditEvents: []
};
```

- [ ] **Step 5: Test schema behavior**

Create `src/domain/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bpReadingInputSchema, careContextInputSchema } from "./schemas";

describe("domain schemas", () => {
  it("accepts a valid blood pressure reading", () => {
    const result = bpReadingInputSchema.parse({
      systolic: "128",
      diastolic: "82",
      pulse: "72",
      contexts: ["morning"],
      note: "Before coffee"
    });

    expect(result.systolic).toBe(128);
    expect(result.pulse).toBe(72);
  });

  it("rejects an implausible blood pressure reading", () => {
    expect(() =>
      bpReadingInputSchema.parse({
        systolic: 340,
        diastolic: 20,
        pulse: 72,
        contexts: ["morning"],
        note: ""
      })
    ).toThrow();
  });

  it("requires enough care instruction text to interpret", () => {
    expect(() =>
      careContextInputSchema.parse({
        title: "Visit",
        rawText: "BP",
        sourceLabel: "Portal"
      })
    ).toThrow();
  });
});
```

- [ ] **Step 6: Run tests and commit**

Run: `npm run test -- src/domain/schemas.test.ts`

Expected: PASS.

```bash
git add src/test src/domain
git commit -m "feat: add home health domain model"
```

---

### Task 3: Blood Pressure Rules and Safety Escalation

**Files:**
- Create: `src/domain/blood-pressure.ts`
- Create: `src/domain/safety.ts`
- Test: `src/domain/blood-pressure.test.ts`
- Test: `src/domain/safety.test.ts`

**Interfaces:**
- Consumes: `CarePlan`, `HomeReading`, `Medication`
- Produces: `interpretBloodPressure(reading, readings, carePlan)`, `classifySafety(input)`

- [ ] **Step 1: Write blood pressure rule tests**

Create `src/domain/blood-pressure.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { interpretBloodPressure } from "./blood-pressure";
import { demoState } from "./fixtures";
import type { HomeReading } from "./types";

const baseReading: HomeReading = {
  id: "reading-1",
  patientId: "patient-1",
  systolic: 151,
  diastolic: 92,
  pulse: 72,
  measuredAt: "2026-07-05T09:00:00.000Z",
  contexts: ["morning"],
  note: ""
};

describe("interpretBloodPressure", () => {
  it("recommends recheck when a reading is high but below call threshold", () => {
    const result = interpretBloodPressure(baseReading, [], demoState.carePlan);

    expect(result.level).toBe("recheck");
    expect(result.message).toContain("Rest quietly for 5 minutes");
    expect(result.escalation).toBe("none");
  });

  it("routes to care team when a plan threshold is met", () => {
    const result = interpretBloodPressure(
      { ...baseReading, systolic: 164, diastolic: 101 },
      [],
      demoState.carePlan
    );

    expect(result.level).toBe("call_clinic");
    expect(result.escalation).toBe("clinic");
  });

  it("labels a lower reading as within the current tracked pattern", () => {
    const result = interpretBloodPressure(
      { ...baseReading, systolic: 124, diastolic: 78 },
      [],
      demoState.carePlan
    );

    expect(result.level).toBe("track");
    expect(result.message).toContain("Log another reading");
  });
});
```

- [ ] **Step 2: Implement blood pressure rules**

Create `src/domain/blood-pressure.ts`:

```ts
import type { CarePlan, HomeReading } from "./types";

export type BloodPressureInsight = {
  level: "track" | "recheck" | "call_clinic";
  message: string;
  escalation: "none" | "clinic";
};

export function interpretBloodPressure(reading: HomeReading, recentReadings: HomeReading[], carePlan: CarePlan): BloodPressureInsight {
  const thresholdMet =
    (carePlan.callThresholdSystolic !== null && reading.systolic >= carePlan.callThresholdSystolic) ||
    (carePlan.callThresholdDiastolic !== null && reading.diastolic >= carePlan.callThresholdDiastolic);

  if (thresholdMet) {
    return {
      level: "call_clinic",
      message: `This reading meets the call threshold in your plan. Contact ${carePlan.patientId === "patient-1" ? "your clinic" : "your care team"} and share this reading.`,
      escalation: "clinic"
    };
  }

  if (reading.systolic >= 140 || reading.diastolic >= 90) {
    return {
      level: "recheck",
      message: "This reading is higher than the usual home goal range. Rest quietly for 5 minutes with both feet on the floor, then recheck and log the next reading.",
      escalation: "none"
    };
  }

  const hasRecentHigh = recentReadings.slice(-3).some((item) => item.systolic >= 140 || item.diastolic >= 90);

  return {
    level: "track",
    message: hasRecentHigh
      ? "This reading is lower than a recent high reading. Log another reading at your next planned time so your care team can see the pattern."
      : "This reading is within the current tracked pattern. Keep logging readings so your care team can review the trend.",
    escalation: "none"
  };
}
```

- [ ] **Step 3: Write safety tests**

Create `src/domain/safety.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifySafety } from "./safety";

describe("classifySafety", () => {
  it("blocks medication change advice", () => {
    const result = classifySafety("Should I stop taking lisinopril?");

    expect(result.level).toBe("blocked");
    expect(result.response).toContain("I cannot tell you to stop");
  });

  it("escalates warning symptoms", () => {
    const result = classifySafety("I have chest pain and my blood pressure is high.");

    expect(result.level).toBe("escalate");
    expect(result.response).toContain("seek urgent medical help");
  });

  it("allows education questions", () => {
    const result = classifySafety("Why does blood pressure medicine matter?");

    expect(result.level).toBe("allowed");
  });
});
```

- [ ] **Step 4: Implement safety classifier**

Create `src/domain/safety.ts`:

```ts
export type SafetyClassification = {
  level: "allowed" | "escalate" | "blocked";
  response: string;
};

const medicationChangePatterns = [/stop taking/i, /change my dose/i, /double my dose/i, /skip my medicine/i, /take extra/i];
const urgentSymptomPatterns = [/chest pain/i, /shortness of breath/i, /weakness on one side/i, /new confusion/i, /severe headache/i, /fainting/i];

export function classifySafety(input: string): SafetyClassification {
  if (urgentSymptomPatterns.some((pattern) => pattern.test(input))) {
    return {
      level: "escalate",
      response: "Some symptoms need urgent attention. If this may be an emergency, seek urgent medical help now. I can help you summarize what is happening for your care team."
    };
  }

  if (medicationChangePatterns.some((pattern) => pattern.test(input))) {
    return {
      level: "blocked",
      response: "I cannot tell you to stop, start, or change a medication dose. I can help you write a short message to your care team with your concern, symptoms, and recent readings."
    };
  }

  return {
    level: "allowed",
    response: ""
  };
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/domain/blood-pressure.test.ts src/domain/safety.test.ts`

Expected: PASS.

```bash
git add src/domain/blood-pressure.ts src/domain/safety.ts src/domain/blood-pressure.test.ts src/domain/safety.test.ts
git commit -m "feat: add blood pressure safety rules"
```

---

### Task 4: AI Provider Contract and Safety Gate

**Files:**
- Create: `src/ai/types.ts`
- Create: `src/ai/prompts.ts`
- Create: `src/ai/mock-provider.ts`
- Create: `src/ai/safety-gate.ts`
- Test: `src/ai/mock-provider.test.ts`
- Test: `src/ai/safety-gate.test.ts`

**Interfaces:**
- Consumes: `AiMode`, `AppState`, `classifySafety`
- Produces: `HealthAiProvider`, `MockHealthAiProvider`, `createSafeAiResponse(request, provider)`

- [ ] **Step 1: Define AI contracts**

Create `src/ai/types.ts`:

```ts
import type { AiMode, AppState } from "@/domain/types";

export type HealthAiRequest = {
  mode: AiMode;
  patientInput: string;
  state: AppState;
};

export type HealthAiResponse = {
  content: string;
  safety: "allowed" | "escalate" | "blocked";
  sources: string[];
};

export type HealthAiProvider = {
  respond(request: HealthAiRequest): Promise<HealthAiResponse>;
};
```

Create `src/ai/prompts.ts`:

```ts
export const HEALTH_AI_SYSTEM_PROMPT_VERSION = "home-health-v0.1-2026-07-05";

export const healthAiSystemPrompt = [
  "You help patients understand and follow clinician-authored home care plans.",
  "You explain, coach, organize, summarize, and route to care.",
  "You do not diagnose, prescribe, change medication doses, or replace emergency care.",
  "Answer from confirmed patient facts and the care plan first.",
  "Label general education clearly when plan-specific facts are unavailable.",
  "For medication changes, side effects, or warning symptoms, help the patient contact the care team."
].join(" ");
```

- [ ] **Step 2: Add mock provider tests**

Create `src/ai/mock-provider.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MockHealthAiProvider } from "./mock-provider";

describe("MockHealthAiProvider", () => {
  it("explains a medication using the patient medication list", async () => {
    const provider = new MockHealthAiProvider();
    const response = await provider.respond({
      mode: "why",
      patientInput: "Why am I taking lisinopril?",
      state: demoState
    });

    expect(response.content).toContain("Lisinopril");
    expect(response.content).toContain("stroke");
    expect(response.sources).toContain("med-1");
  });

  it("creates visit prep guidance", async () => {
    const provider = new MockHealthAiProvider();
    const response = await provider.respond({
      mode: "visit",
      patientInput: "Help me prepare for my appointment.",
      state: demoState
    });

    expect(response.content).toContain("Bring your recent home readings");
    expect(response.sources).toContain("plan-1");
  });
});
```

- [ ] **Step 3: Implement mock provider**

Create `src/ai/mock-provider.ts`:

```ts
import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";

export class MockHealthAiProvider implements HealthAiProvider {
  async respond(request: HealthAiRequest): Promise<HealthAiResponse> {
    const medication = request.state.medications[0];

    if (request.mode === "why" && medication) {
      return {
        content: `${medication.name} is listed in your medicines as: ${medication.purpose} ${medication.preventionBenefit} ${medication.safetyNote}`,
        safety: "allowed",
        sources: [medication.id]
      };
    }

    if (request.mode === "visit") {
      return {
        content: "Bring your recent home readings, any missed doses, side effects, and the top question you want answered. Your plan says the next visit is to review readings and medication barriers.",
        safety: "allowed",
        sources: [request.state.carePlan.id]
      };
    }

    return {
      content: "I can help explain your plan, prepare questions, summarize readings, or organize what to share with your care team.",
      safety: "allowed",
      sources: [request.state.carePlan.id]
    };
  }
}
```

- [ ] **Step 4: Add safety gate tests**

Create `src/ai/safety-gate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MockHealthAiProvider } from "./mock-provider";
import { createSafeAiResponse } from "./safety-gate";

describe("createSafeAiResponse", () => {
  it("blocks unsafe medication change requests before provider call", async () => {
    const response = await createSafeAiResponse(
      {
        mode: "trouble",
        patientInput: "Should I stop taking lisinopril?",
        state: demoState
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("blocked");
    expect(response.content).toContain("I cannot tell you to stop");
  });

  it("allows education requests through the provider", async () => {
    const response = await createSafeAiResponse(
      {
        mode: "why",
        patientInput: "Why am I taking lisinopril?",
        state: demoState
      },
      new MockHealthAiProvider()
    );

    expect(response.safety).toBe("allowed");
    expect(response.content).toContain("Lisinopril");
  });
});
```

- [ ] **Step 5: Implement safety gate**

Create `src/ai/safety-gate.ts`:

```ts
import { classifySafety } from "@/domain/safety";
import type { HealthAiProvider, HealthAiRequest, HealthAiResponse } from "./types";

export async function createSafeAiResponse(request: HealthAiRequest, provider: HealthAiProvider): Promise<HealthAiResponse> {
  const safety = classifySafety(request.patientInput);

  if (safety.level !== "allowed") {
    return {
      content: safety.response,
      safety: safety.level,
      sources: []
    };
  }

  const response = await provider.respond(request);

  if (response.safety === "blocked" || response.safety === "escalate") {
    return response;
  }

  return {
    ...response,
    safety: "allowed"
  };
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm run test -- src/ai/mock-provider.test.ts src/ai/safety-gate.test.ts`

Expected: PASS.

```bash
git add src/ai
git commit -m "feat: add safe AI provider boundary"
```

---

### Task 5: Local State, Persistence, and Audit Events

**Files:**
- Create: `src/domain/audit.ts`
- Create: `src/state/storage.ts`
- Create: `src/state/store.tsx`
- Test: `src/state/store.test.ts`

**Interfaces:**
- Consumes: `AppState`, `demoState`, domain objects
- Produces: `HealthStateProvider`, `useHealthState()`, reducer actions, `recordAuditEvent()`

- [ ] **Step 1: Define audit helper**

Create `src/domain/audit.ts`:

```ts
import type { AuditEvent } from "./types";

export function recordAuditEvent(patientId: string, action: AuditEvent["action"], label: string): AuditEvent {
  return {
    id: crypto.randomUUID(),
    patientId,
    action,
    label,
    createdAt: new Date().toISOString()
  };
}
```

- [ ] **Step 2: Add storage adapter**

Create `src/state/storage.ts`:

```ts
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";

const STORAGE_KEY = "home-health-ai-ownership-state";

export function loadStoredState(): AppState {
  if (typeof window === "undefined") {
    return demoState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return demoState;
  }

  return JSON.parse(raw) as AppState;
}

export function saveStoredState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 3: Add reducer tests**

Create `src/state/store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { healthReducer } from "./store";

describe("healthReducer", () => {
  it("adds a blood pressure reading and audit event", () => {
    const next = healthReducer(demoState, {
      type: "addReading",
      reading: {
        id: "reading-1",
        patientId: "patient-1",
        systolic: 128,
        diastolic: 82,
        pulse: 72,
        measuredAt: "2026-07-05T09:00:00.000Z",
        contexts: ["morning"],
        note: "Before coffee"
      }
    });

    expect(next.readings).toHaveLength(1);
    expect(next.auditEvents.at(-1)?.label).toBe("Blood pressure reading added");
  });

  it("captures a medication barrier without removing existing medicine details", () => {
    const next = healthReducer(demoState, {
      type: "setMedicationBarriers",
      medicationId: "med-1",
      barriers: ["cost", "side_effects"]
    });

    expect(next.medications[0].name).toBe("Lisinopril");
    expect(next.medications[0].activeBarriers).toEqual(["cost", "side_effects"]);
  });
});
```

- [ ] **Step 4: Implement store and provider**

Create `src/state/store.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { demoState } from "@/domain/fixtures";
import { recordAuditEvent } from "@/domain/audit";
import type { AiMessage, AppState, AuditEvent, CareContextItem, ExtractedFact, HomeReading, MedicationBarrier } from "@/domain/types";
import { loadStoredState, saveStoredState } from "./storage";

export type HealthAction =
  | { type: "addReading"; reading: HomeReading }
  | { type: "setMedicationBarriers"; medicationId: string; barriers: MedicationBarrier[] }
  | { type: "addContextItem"; item: CareContextItem; facts: ExtractedFact[] }
  | { type: "confirmFact"; factId: string }
  | { type: "addAiMessage"; message: AiMessage }
  | { type: "addAuditEvent"; event: AuditEvent }
  | { type: "resetDemo" };

export function healthReducer(state: AppState, action: HealthAction): AppState {
  if (action.type === "addReading") {
    return {
      ...state,
      readings: [...state.readings, action.reading],
      auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "created", "Blood pressure reading added")]
    };
  }

  if (action.type === "setMedicationBarriers") {
    return {
      ...state,
      medications: state.medications.map((medication) =>
        medication.id === action.medicationId ? { ...medication, activeBarriers: action.barriers } : medication
      ),
      auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "updated", "Medication barrier updated")]
    };
  }

  if (action.type === "addContextItem") {
    return {
      ...state,
      contextItems: [...state.contextItems, action.item],
      extractedFacts: [...state.extractedFacts, ...action.facts],
      auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "created", "Care instructions added")]
    };
  }

  if (action.type === "confirmFact") {
    return {
      ...state,
      extractedFacts: state.extractedFacts.map((fact) => (fact.id === action.factId ? { ...fact, status: "confirmed" } : fact)),
      auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "updated", "Extracted fact confirmed")]
    };
  }

  if (action.type === "addAiMessage") {
    return {
      ...state,
      aiMessages: [...state.aiMessages, action.message],
      auditEvents: [...state.auditEvents, recordAuditEvent(state.patient.id, "ai_generated", "AI response generated")]
    };
  }

  if (action.type === "addAuditEvent") {
    return {
      ...state,
      auditEvents: [...state.auditEvents, action.event]
    };
  }

  return demoState;
}

type HealthStateContextValue = {
  state: AppState;
  dispatch: Dispatch<HealthAction>;
};

const HealthStateContext = createContext<HealthStateContextValue | null>(null);

export function HealthStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(healthReducer, demoState, loadStoredState);

  useEffect(() => {
    saveStoredState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <HealthStateContext.Provider value={value}>{children}</HealthStateContext.Provider>;
}

export function useHealthState(): HealthStateContextValue {
  const value = useContext(HealthStateContext);

  if (!value) {
    throw new Error("useHealthState must be used inside HealthStateProvider");
  }

  return value;
}
```

- [ ] **Step 5: Wire provider into layout**

Modify `src/app/layout.tsx`:

```tsx
import "@/styles/globals.css";
import { HealthStateProvider } from "@/state/store";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Home Health Ownership",
  description: "Patient-owned home care support for blood pressure, medicines, and visits."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HealthStateProvider>{children}</HealthStateProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm run test -- src/state/store.test.ts`

Expected: PASS.

```bash
git add src/domain/audit.ts src/state src/app/layout.tsx
git commit -m "feat: add local health state"
```

---

### Task 6: App Shell and Navigation

**Files:**
- Create: `src/components/app-shell.tsx`
- Modify: `src/app/today/page.tsx`
- Modify: `src/app/plan/page.tsx`
- Modify: `src/app/numbers/page.tsx`
- Modify: `src/app/medicines/page.tsx`
- Modify: `src/app/visits/page.tsx`
- Modify: `src/app/intake/page.tsx`
- Modify: `src/app/chat/page.tsx`
- Modify: `src/app/privacy/page.tsx`
- Test: `src/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: app pages and local state provider
- Produces: shared navigation shell with links to Today, Plan, Numbers, Medicines, Visits, Intake, Coach, Privacy

- [ ] **Step 1: Write navigation test**

Create `src/components/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders primary patient-owned navigation", () => {
    render(
      <AppShell title="Today">
        <p>Body</p>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: "My Plan" })).toHaveAttribute("href", "/plan");
    expect(screen.getByRole("link", { name: "My Numbers" })).toHaveAttribute("href", "/numbers");
    expect(screen.getByRole("link", { name: "My Medicines" })).toHaveAttribute("href", "/medicines");
  });
});
```

- [ ] **Step 2: Implement app shell**

Create `src/components/app-shell.tsx`:

```tsx
import { ClipboardList, HeartPulse, Home, LockKeyhole, MessageCircle, Pill, Stethoscope, Upload } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/plan", label: "My Plan", icon: ClipboardList },
  { href: "/numbers", label: "My Numbers", icon: HeartPulse },
  { href: "/medicines", label: "My Medicines", icon: Pill },
  { href: "/visits", label: "My Visits", icon: Stethoscope },
  { href: "/intake", label: "Add Instructions", icon: Upload },
  { href: "/chat", label: "Coach", icon: MessageCircle },
  { href: "/privacy", label: "Privacy", icon: LockKeyhole }
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-medium text-care">Home Health Ownership</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          <Link className="rounded-control bg-care px-4 py-2 text-sm font-semibold text-white" href="/intake">
            Add
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-ink/10 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-2 py-2 sm:grid-cols-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} className="flex min-h-14 flex-col items-center justify-center rounded-control px-1 text-center text-xs font-medium text-ink hover:bg-calm" href={item.href}>
                <Icon aria-hidden="true" className="mb-1 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Create route pages with shell**

Create each page with a temporary route-specific body.

Example `src/app/today/page.tsx`:

```tsx
import { AppShell } from "@/components/app-shell";

export default function TodayPage() {
  return (
    <AppShell title="Today">
      <p>Your next home health actions will appear here.</p>
    </AppShell>
  );
}
```

Use the same pattern for:

- `src/app/plan/page.tsx` title `My Plan`
- `src/app/numbers/page.tsx` title `My Numbers`
- `src/app/medicines/page.tsx` title `My Medicines`
- `src/app/visits/page.tsx` title `My Visits`
- `src/app/intake/page.tsx` title `Add Instructions`
- `src/app/chat/page.tsx` title `Coach`
- `src/app/privacy/page.tsx` title `Privacy`

- [ ] **Step 4: Run tests and commit**

Run: `npm run test -- src/components/app-shell.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

```bash
git add src/components/app-shell.tsx src/components/app-shell.test.tsx src/app
git commit -m "feat: add patient app shell"
```

---

### Task 7: Today Screen and Priority Tasks

**Files:**
- Create: `src/domain/tasks.ts`
- Create: `src/components/action-card.tsx`
- Modify: `src/app/today/page.tsx`
- Test: `src/domain/tasks.test.ts`
- Test: `src/components/action-card.test.tsx`

**Interfaces:**
- Consumes: `AppState`, `TaskItem`
- Produces: `buildTodayTasks(state): TaskItem[]`, action cards on Today screen

- [ ] **Step 1: Test task generation**

Create `src/domain/tasks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { demoState } from "./fixtures";
import { buildTodayTasks } from "./tasks";

describe("buildTodayTasks", () => {
  it("limits Today to three priority items", () => {
    const tasks = buildTodayTasks(demoState);

    expect(tasks.length).toBeLessThanOrEqual(3);
  });

  it("prioritizes blood pressure logging when no readings exist", () => {
    const tasks = buildTodayTasks(demoState);

    expect(tasks[0]).toMatchObject({
      title: "Check blood pressure",
      href: "/numbers"
    });
  });
});
```

- [ ] **Step 2: Implement task generation**

Create `src/domain/tasks.ts`:

```ts
import type { AppState, TaskItem } from "./types";

export function buildTodayTasks(state: AppState): TaskItem[] {
  const tasks: TaskItem[] = [];

  if (state.readings.length === 0) {
    tasks.push({
      id: "task-bp-first",
      title: "Check blood pressure",
      body: "Log your first home reading so your plan can start building a pattern.",
      href: "/numbers",
      priority: 1,
      kind: "reading"
    });
  }

  if (state.medications.some((medication) => medication.activeBarriers.length > 0)) {
    tasks.push({
      id: "task-med-barrier",
      title: "Share what got in the way",
      body: "Your medicine list has a barrier marked. Turn it into a clear question for your care team.",
      href: "/chat",
      priority: 1,
      kind: "medicine"
    });
  } else {
    tasks.push({
      id: "task-med-purpose",
      title: "Review why your medicine matters",
      body: "A quick explanation can make daily medicine feel less random.",
      href: "/medicines",
      priority: 2,
      kind: "medicine"
    });
  }

  tasks.push({
    id: "task-visit-brief",
    title: "Prepare for your next visit",
    body: state.carePlan.nextVisitReason,
    href: "/visits",
    priority: 3,
    kind: "visit"
  });

  return tasks.sort((left, right) => left.priority - right.priority).slice(0, 3);
}
```

- [ ] **Step 3: Build action card**

Create `src/components/action-card.tsx`:

```tsx
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TaskItem } from "@/domain/types";

export function ActionCard({ task }: { task: TaskItem }) {
  return (
    <Link className="block rounded-control border border-ink/10 bg-white p-4 shadow-sm hover:border-care" href={task.href}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">{task.body}</p>
        </div>
        <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-care" />
      </div>
    </Link>
  );
}
```

Create `src/components/action-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionCard } from "./action-card";

describe("ActionCard", () => {
  it("links to the task destination", () => {
    render(
      <ActionCard
        task={{
          id: "task-1",
          title: "Check blood pressure",
          body: "Log a reading.",
          href: "/numbers",
          priority: 1,
          kind: "reading"
        }}
      />
    );

    expect(screen.getByRole("link", { name: /check blood pressure/i })).toHaveAttribute("href", "/numbers");
  });
});
```

- [ ] **Step 4: Render Today screen**

Modify `src/app/today/page.tsx`:

```tsx
"use client";

import { ActionCard } from "@/components/action-card";
import { AppShell } from "@/components/app-shell";
import { buildTodayTasks } from "@/domain/tasks";
import { useHealthState } from "@/state/store";

export default function TodayPage() {
  const { state } = useHealthState();
  const tasks = buildTodayTasks(state);

  return (
    <AppShell title="Today">
      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium text-care">Hi {state.patient.preferredName}</p>
          <h2 className="mt-1 text-2xl font-semibold">Here is what matters at home today.</h2>
        </div>
        <div className="grid gap-3">
          {tasks.map((task) => (
            <ActionCard key={task.id} task={task} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/domain/tasks.test.ts src/components/action-card.test.tsx`

Expected: PASS.

```bash
git add src/domain/tasks.ts src/domain/tasks.test.ts src/components/action-card.tsx src/components/action-card.test.tsx src/app/today/page.tsx
git commit -m "feat: add today action feed"
```

---

### Task 8: Blood Pressure Logging and Insights

**Files:**
- Create: `src/components/bp-log-form.tsx`
- Modify: `src/app/numbers/page.tsx`
- Test: `src/components/bp-log-form.test.tsx`

**Interfaces:**
- Consumes: `bpReadingInputSchema`, `interpretBloodPressure`, `useHealthState`
- Produces: blood pressure logging form and recent insight display

- [ ] **Step 1: Test BP form submission**

Create `src/components/bp-log-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BpLogForm } from "./bp-log-form";

describe("BpLogForm", () => {
  it("submits a valid reading", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<BpLogForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Top number"), "128");
    await user.type(screen.getByLabelText("Bottom number"), "82");
    await user.type(screen.getByLabelText("Pulse"), "72");
    await user.click(screen.getByLabelText("Morning"));
    await user.click(screen.getByRole("button", { name: "Save reading" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        systolic: 128,
        diastolic: 82,
        pulse: 72,
        contexts: ["morning"]
      })
    );
  });
});
```

- [ ] **Step 2: Implement BP form**

Create `src/components/bp-log-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { bpReadingInputSchema } from "@/domain/schemas";
import type { MeasurementContext } from "@/domain/types";

type BpLogFormValues = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  contexts: MeasurementContext[];
  note: string;
};

export function BpLogForm({ onSubmit }: { onSubmit: (values: BpLogFormValues) => void }) {
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    const context = formData.get("context");
    const parsed = bpReadingInputSchema.safeParse({
      systolic: formData.get("systolic"),
      diastolic: formData.get("diastolic"),
      pulse: formData.get("pulse") ? formData.get("pulse") : null,
      contexts: context ? [context] : [],
      note: formData.get("note") ?? ""
    });

    if (!parsed.success) {
      setError("Check the numbers and select when this reading was taken.");
      return;
    }

    setError("");
    onSubmit(parsed.data);
  }

  return (
    <form action={handleSubmit} className="rounded-control border border-ink/10 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Top number
          <input className="rounded-control border border-ink/20 px-3 py-2" inputMode="numeric" name="systolic" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Bottom number
          <input className="rounded-control border border-ink/20 px-3 py-2" inputMode="numeric" name="diastolic" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Pulse
          <input className="rounded-control border border-ink/20 px-3 py-2" inputMode="numeric" name="pulse" />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">When was this?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["morning", "Morning"],
            ["evening", "Evening"],
            ["after_resting", "After resting"],
            ["during_symptoms", "During symptoms"]
          ].map(([value, label]) => (
            <label key={value} className="rounded-control border border-ink/15 px-3 py-2 text-sm">
              <input className="mr-2" name="context" type="radio" value={value} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 grid gap-1 text-sm font-medium">
        Note
        <textarea className="min-h-20 rounded-control border border-ink/20 px-3 py-2" name="note" />
      </label>
      {error ? <p className="mt-3 text-sm font-medium text-pulse">{error}</p> : null}
      <button className="mt-4 rounded-control bg-care px-4 py-2 font-semibold text-white" type="submit">
        Save reading
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Render Numbers screen**

Modify `src/app/numbers/page.tsx`:

```tsx
"use client";

import { BpLogForm } from "@/components/bp-log-form";
import { AppShell } from "@/components/app-shell";
import { interpretBloodPressure } from "@/domain/blood-pressure";
import type { HomeReading } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function NumbersPage() {
  const { state, dispatch } = useHealthState();
  const latest = state.readings.at(-1);
  const insight = latest ? interpretBloodPressure(latest, state.readings.slice(0, -1), state.carePlan) : null;

  return (
    <AppShell title="My Numbers">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Log blood pressure</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">Use the numbers from your cuff. The app helps you notice patterns and prepare for visits.</p>
        </section>
        <BpLogForm
          onSubmit={(values) => {
            const reading: HomeReading = {
              id: crypto.randomUUID(),
              patientId: state.patient.id,
              systolic: values.systolic,
              diastolic: values.diastolic,
              pulse: values.pulse,
              measuredAt: new Date().toISOString(),
              contexts: values.contexts,
              note: values.note
            };
            dispatch({ type: "addReading", reading });
          }}
        />
        {insight ? (
          <section className="rounded-control border border-care/30 bg-calm p-4">
            <h2 className="text-lg font-semibold">Latest insight</h2>
            <p className="mt-2 text-sm leading-6">{insight.message}</p>
          </section>
        ) : null}
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Recent readings</h2>
          {state.readings.slice(-5).reverse().map((reading) => (
            <div key={reading.id} className="rounded-control border border-ink/10 bg-white p-3 text-sm">
              <strong>{reading.systolic}/{reading.diastolic}</strong>
              {reading.pulse ? <span> pulse {reading.pulse}</span> : null}
              <p className="text-ink/65">{new Date(reading.measuredAt).toLocaleString()}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm run test -- src/components/bp-log-form.test.tsx src/domain/blood-pressure.test.ts`

Expected: PASS.

```bash
git add src/components/bp-log-form.tsx src/components/bp-log-form.test.tsx src/app/numbers/page.tsx
git commit -m "feat: add blood pressure logging"
```

---

### Task 9: Medication Ownership and Barrier Capture

**Files:**
- Create: `src/components/medication-card.tsx`
- Modify: `src/app/medicines/page.tsx`
- Test: `src/components/medication-card.test.tsx`

**Interfaces:**
- Consumes: `Medication`, `MedicationBarrier`, `useHealthState`
- Produces: medicine explanation cards and barrier capture

- [ ] **Step 1: Test medication card**

Create `src/components/medication-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import { MedicationCard } from "./medication-card";

describe("MedicationCard", () => {
  it("shows purpose and captures a barrier", async () => {
    const user = userEvent.setup();
    const onBarriersChange = vi.fn();

    render(<MedicationCard medication={demoState.medications[0]} onBarriersChange={onBarriersChange} />);

    expect(screen.getByText("Helps lower blood pressure.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("It costs too much"));

    expect(onBarriersChange).toHaveBeenCalledWith(["cost"]);
  });
});
```

- [ ] **Step 2: Implement medication card**

Create `src/components/medication-card.tsx`:

```tsx
"use client";

import type { Medication, MedicationBarrier } from "@/domain/types";

const barrierOptions: Array<{ value: MedicationBarrier; label: string }> = [
  { value: "forgot", label: "I forgot" },
  { value: "ran_out", label: "I ran out" },
  { value: "cost", label: "It costs too much" },
  { value: "side_effects", label: "I feel side effects" },
  { value: "confused", label: "I am confused" },
  { value: "scared", label: "I am scared" },
  { value: "pharmacy_issue", label: "The pharmacy has an issue" },
  { value: "does_not_feel_necessary", label: "It does not feel necessary" }
];

export function MedicationCard({ medication, onBarriersChange }: { medication: Medication; onBarriersChange: (barriers: MedicationBarrier[]) => void }) {
  function toggleBarrier(value: MedicationBarrier) {
    const next = medication.activeBarriers.includes(value)
      ? medication.activeBarriers.filter((barrier) => barrier !== value)
      : [...medication.activeBarriers, value];
    onBarriersChange(next);
  }

  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{medication.name}</h2>
          <p className="text-sm text-ink/65">{medication.dose} - {medication.schedule}</p>
        </div>
        <span className="rounded-control bg-calm px-2 py-1 text-xs font-semibold text-care">{medication.source.replace("_", " ")}</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-6">
        <p><strong>Why:</strong> {medication.purpose}</p>
        <p><strong>What it helps prevent:</strong> {medication.preventionBenefit}</p>
        <p><strong>Safety note:</strong> {medication.safetyNote}</p>
      </div>
      <fieldset className="mt-4">
        <legend className="font-semibold">I am not taking this because...</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {barrierOptions.map((option) => (
            <label key={option.value} className="rounded-control border border-ink/15 px-3 py-2 text-sm">
              <input
                checked={medication.activeBarriers.includes(option.value)}
                className="mr-2"
                onChange={() => toggleBarrier(option.value)}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </article>
  );
}
```

- [ ] **Step 3: Render medicines screen**

Modify `src/app/medicines/page.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app-shell";
import { MedicationCard } from "@/components/medication-card";
import { useHealthState } from "@/state/store";

export default function MedicinesPage() {
  const { state, dispatch } = useHealthState();

  return (
    <AppShell title="My Medicines">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Understand what you take</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">These cards explain why each medicine matters and capture what gets in the way without blame.</p>
        </section>
        {state.medications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            onBarriersChange={(barriers) => dispatch({ type: "setMedicationBarriers", medicationId: medication.id, barriers })}
          />
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm run test -- src/components/medication-card.test.tsx src/state/store.test.ts`

Expected: PASS.

```bash
git add src/components/medication-card.tsx src/components/medication-card.test.tsx src/app/medicines/page.tsx
git commit -m "feat: add medication ownership cards"
```

---

### Task 10: Care Plan and Instruction Intake

**Files:**
- Create: `src/domain/instructions.ts`
- Create: `src/components/intake-review-card.tsx`
- Modify: `src/app/intake/page.tsx`
- Modify: `src/app/plan/page.tsx`
- Test: `src/domain/instructions.test.ts`
- Test: `src/components/intake-review-card.test.tsx`

**Interfaces:**
- Consumes: `CareContextItem`, `ExtractedFact`, `careContextInputSchema`
- Produces: `extractInstructionFacts(item): ExtractedFact[]`, confirmation cards, My Plan view

- [ ] **Step 1: Test instruction extraction**

Create `src/domain/instructions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractInstructionFacts } from "./instructions";
import type { CareContextItem } from "./types";

describe("extractInstructionFacts", () => {
  it("extracts blood pressure monitoring and follow-up from text", () => {
    const item: CareContextItem = {
      id: "ctx-1",
      patientId: "patient-1",
      title: "Visit instructions",
      rawText: "Monitor BP daily. Continue lisinopril. Follow up in 4 weeks.",
      sourceLabel: "Portal note",
      createdAt: "2026-07-05T09:00:00.000Z"
    };

    const facts = extractInstructionFacts(item);

    expect(facts.map((fact) => fact.label)).toContain("Home monitoring");
    expect(facts.map((fact) => fact.label)).toContain("Follow-up timing");
    expect(facts.every((fact) => fact.status === "needs_review")).toBe(true);
  });
});
```

- [ ] **Step 2: Implement extraction logic**

Create `src/domain/instructions.ts`:

```ts
import type { CareContextItem, ExtractedFact } from "./types";

export function extractInstructionFacts(item: CareContextItem): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const text = item.rawText.toLowerCase();

  if (text.includes("monitor bp") || text.includes("blood pressure") || text.includes("bp daily")) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Home monitoring",
      value: "Check blood pressure at home",
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["Monitor BP", "blood pressure", "BP daily"])
    });
  }

  if (text.includes("continue") && text.includes("lisinopril")) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Medication instruction",
      value: "Continue lisinopril as prescribed",
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["Continue lisinopril", "lisinopril"])
    });
  }

  if (text.includes("follow up") || text.includes("follow-up")) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Follow-up timing",
      value: "Follow up with care team",
      confidence: "medium",
      status: "needs_review",
      sourceSnippet: findSnippet(item.rawText, ["Follow up", "follow-up"])
    });
  }

  if (facts.length === 0) {
    facts.push({
      id: crypto.randomUUID(),
      contextItemId: item.id,
      label: "Needs review",
      value: "The app could not confidently identify a home action",
      confidence: "low",
      status: "needs_review",
      sourceSnippet: item.rawText.slice(0, 180)
    });
  }

  return facts;
}

function findSnippet(text: string, needles: string[]): string {
  const lower = text.toLowerCase();
  const found = needles.find((needle) => lower.includes(needle.toLowerCase()));

  if (!found) {
    return text.slice(0, 180);
  }

  const start = Math.max(0, lower.indexOf(found.toLowerCase()) - 40);
  return text.slice(start, start + 180);
}
```

- [ ] **Step 3: Add confirmation card**

Create `src/components/intake-review-card.tsx`:

```tsx
import type { ExtractedFact } from "@/domain/types";

export function IntakeReviewCard({ fact, onConfirm }: { fact: ExtractedFact; onConfirm: () => void }) {
  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{fact.label}</h2>
          <p className="mt-1 text-sm leading-6">{fact.value}</p>
        </div>
        <span className="rounded-control bg-note px-2 py-1 text-xs font-semibold">{fact.confidence}</span>
      </div>
      <blockquote className="mt-3 border-l-4 border-care/40 pl-3 text-sm text-ink/70">{fact.sourceSnippet}</blockquote>
      <button className="mt-4 rounded-control bg-care px-4 py-2 text-sm font-semibold text-white" disabled={fact.status === "confirmed"} onClick={onConfirm} type="button">
        {fact.status === "confirmed" ? "Confirmed" : "Confirm"}
      </button>
    </article>
  );
}
```

Create `src/components/intake-review-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IntakeReviewCard } from "./intake-review-card";

describe("IntakeReviewCard", () => {
  it("calls onConfirm when the user confirms a fact", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <IntakeReviewCard
        fact={{
          id: "fact-1",
          contextItemId: "ctx-1",
          label: "Home monitoring",
          value: "Check blood pressure at home",
          confidence: "medium",
          status: "needs_review",
          sourceSnippet: "Monitor BP daily"
        }}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: Render intake and plan pages**

Modify `src/app/intake/page.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app-shell";
import { IntakeReviewCard } from "@/components/intake-review-card";
import { extractInstructionFacts } from "@/domain/instructions";
import { careContextInputSchema } from "@/domain/schemas";
import type { CareContextItem } from "@/domain/types";
import { useHealthState } from "@/state/store";

export default function IntakePage() {
  const { state, dispatch } = useHealthState();

  function handleSubmit(formData: FormData) {
    const parsed = careContextInputSchema.safeParse({
      title: formData.get("title"),
      rawText: formData.get("rawText"),
      sourceLabel: formData.get("sourceLabel")
    });

    if (!parsed.success) {
      return;
    }

    const item: CareContextItem = {
      id: crypto.randomUUID(),
      patientId: state.patient.id,
      title: parsed.data.title,
      rawText: parsed.data.rawText,
      sourceLabel: parsed.data.sourceLabel,
      createdAt: new Date().toISOString()
    };

    dispatch({ type: "addContextItem", item, facts: extractInstructionFacts(item) });
  }

  return (
    <AppShell title="Add Instructions">
      <div className="grid gap-5">
        <form action={handleSubmit} className="rounded-control border border-ink/10 bg-white p-4">
          <label className="grid gap-1 text-sm font-medium">
            Title
            <input className="rounded-control border border-ink/20 px-3 py-2" name="title" />
          </label>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Source
            <input className="rounded-control border border-ink/20 px-3 py-2" name="sourceLabel" />
          </label>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Paste instructions
            <textarea className="min-h-36 rounded-control border border-ink/20 px-3 py-2" name="rawText" />
          </label>
          <button className="mt-4 rounded-control bg-care px-4 py-2 font-semibold text-white" type="submit">
            Interpret instructions
          </button>
        </form>
        <section className="grid gap-3">
          {state.extractedFacts.map((fact) => (
            <IntakeReviewCard key={fact.id} fact={fact} onConfirm={() => dispatch({ type: "confirmFact", factId: fact.id })} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
```

Modify `src/app/plan/page.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app-shell";
import { useHealthState } from "@/state/store";

export default function PlanPage() {
  const { state } = useHealthState();
  const confirmedFacts = state.extractedFacts.filter((fact) => fact.status === "confirmed");

  return (
    <AppShell title="My Plan">
      <div className="grid gap-5">
        <section className="rounded-control border border-care/20 bg-calm p-4">
          <h2 className="text-xl font-semibold">What you are managing</h2>
          <p className="mt-2 text-sm leading-6">{state.carePlan.plainLanguageSummary}</p>
        </section>
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Daily home actions</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {state.carePlan.dailyActions.map((action) => (
              <li key={action}>- {action}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-control border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Confirmed instructions</h2>
          {confirmedFacts.length === 0 ? <p className="mt-2 text-sm text-ink/70">Confirmed instructions will appear here after review.</p> : null}
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {confirmedFacts.map((fact) => (
              <li key={fact.id}>- {fact.value}</li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/domain/instructions.test.ts src/components/intake-review-card.test.tsx`

Expected: PASS.

```bash
git add src/domain/instructions.ts src/domain/instructions.test.ts src/components/intake-review-card.tsx src/components/intake-review-card.test.tsx src/app/intake/page.tsx src/app/plan/page.tsx
git commit -m "feat: add care instruction intake"
```

---

### Task 11: Guided Conversational AI

**Files:**
- Create: `src/components/conversation-panel.tsx`
- Modify: `src/app/chat/page.tsx`
- Test: `src/components/conversation-panel.test.tsx`

**Interfaces:**
- Consumes: `AiMode`, `createSafeAiResponse`, `MockHealthAiProvider`, `useHealthState`
- Produces: guided conversation UI with safe AI responses stored in state

- [ ] **Step 1: Test conversation panel modes**

Create `src/components/conversation-panel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanel } from "./conversation-panel";

describe("ConversationPanel", () => {
  it("submits patient input with the selected mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ConversationPanel onSubmit={onSubmit} messages={[]} />);

    await user.click(screen.getByRole("button", { name: "Why does this matter?" }));
    await user.type(screen.getByLabelText("Message"), "Why am I taking lisinopril?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith("why", "Why am I taking lisinopril?");
  });
});
```

- [ ] **Step 2: Implement conversation panel**

Create `src/components/conversation-panel.tsx`:

```tsx
"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import type { AiMessage, AiMode } from "@/domain/types";

const modes: Array<{ mode: AiMode; label: string }> = [
  { mode: "explain", label: "Explain this" },
  { mode: "today", label: "Help me do today" },
  { mode: "why", label: "Why does this matter?" },
  { mode: "ask", label: "What should I ask?" },
  { mode: "trouble", label: "I am having trouble" },
  { mode: "visit", label: "Prepare for my visit" },
  { mode: "summarize", label: "Summarize for someone" }
];

export function ConversationPanel({ messages, onSubmit }: { messages: AiMessage[]; onSubmit: (mode: AiMode, input: string) => void }) {
  const [mode, setMode] = useState<AiMode>("explain");
  const [input, setInput] = useState("");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((item) => (
          <button
            className={`rounded-control border px-3 py-2 text-sm font-medium ${mode === item.mode ? "border-care bg-calm text-care" : "border-ink/15 bg-white"}`}
            key={item.mode}
            onClick={() => setMode(item.mode)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {messages.map((message) => (
          <article key={message.id} className={`rounded-control p-3 text-sm leading-6 ${message.role === "assistant" ? "bg-white" : "bg-calm"}`}>
            <p>{message.content}</p>
            {message.sources.length > 0 ? <p className="mt-2 text-xs text-ink/60">Sources: {message.sources.join(", ")}</p> : null}
          </article>
        ))}
      </div>
      <form
        action={() => {
          const trimmed = input.trim();
          if (trimmed.length === 0) {
            return;
          }
          onSubmit(mode, trimmed);
          setInput("");
        }}
        className="rounded-control border border-ink/10 bg-white p-3"
      >
        <label className="grid gap-1 text-sm font-medium">
          Message
          <textarea className="min-h-24 rounded-control border border-ink/20 px-3 py-2" onChange={(event) => setInput(event.target.value)} value={input} />
        </label>
        <button className="mt-3 inline-flex items-center gap-2 rounded-control bg-care px-4 py-2 font-semibold text-white" type="submit">
          <Send aria-hidden="true" className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Render chat page**

Modify `src/app/chat/page.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app-shell";
import { ConversationPanel } from "@/components/conversation-panel";
import { MockHealthAiProvider } from "@/ai/mock-provider";
import { createSafeAiResponse } from "@/ai/safety-gate";
import type { AiMode } from "@/domain/types";
import { useHealthState } from "@/state/store";

const provider = new MockHealthAiProvider();

export default function ChatPage() {
  const { state, dispatch } = useHealthState();

  async function handleSubmit(mode: AiMode, patientInput: string) {
    dispatch({
      type: "addAiMessage",
      message: {
        id: crypto.randomUUID(),
        mode,
        role: "patient",
        content: patientInput,
        createdAt: new Date().toISOString(),
        safety: "allowed",
        sources: []
      }
    });

    const response = await createSafeAiResponse({ mode, patientInput, state }, provider);

    dispatch({
      type: "addAiMessage",
      message: {
        id: crypto.randomUUID(),
        mode,
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
        safety: response.safety,
        sources: response.sources
      }
    });
  }

  return (
    <AppShell title="Coach">
      <ConversationPanel messages={state.aiMessages} onSubmit={handleSubmit} />
    </AppShell>
  );
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm run test -- src/components/conversation-panel.test.tsx src/ai/safety-gate.test.ts`

Expected: PASS.

```bash
git add src/components/conversation-panel.tsx src/components/conversation-panel.test.tsx src/app/chat/page.tsx
git commit -m "feat: add guided AI coach"
```

---

### Task 12: Health Brief Compiler and Visits Screen

**Files:**
- Create: `src/domain/health-brief.ts`
- Create: `src/components/health-brief-card.tsx`
- Modify: `src/app/visits/page.tsx`
- Test: `src/domain/health-brief.test.ts`
- Test: `src/components/health-brief-card.test.tsx`

**Interfaces:**
- Consumes: `AppState`, readings, medications, barriers, confirmed facts
- Produces: `buildHealthBrief(state): HealthBrief`, printable/shareable Health Brief screen

- [ ] **Step 1: Test Health Brief compiler**

Create `src/domain/health-brief.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { demoState } from "./fixtures";
import { buildHealthBrief } from "./health-brief";

describe("buildHealthBrief", () => {
  it("includes care goal and medication sections", () => {
    const brief = buildHealthBrief(demoState);

    expect(brief.sections.map((section) => section.title)).toContain("What I am working on");
    expect(brief.sections.map((section) => section.title)).toContain("Medicines and barriers");
  });
});
```

- [ ] **Step 2: Implement compiler**

Create `src/domain/health-brief.ts`:

```ts
import type { AppState, HealthBrief } from "./types";

export function buildHealthBrief(state: AppState): HealthBrief {
  const recentReadings = state.readings.slice(-7).map((reading) => `${reading.systolic}/${reading.diastolic}${reading.pulse ? ` pulse ${reading.pulse}` : ""}`);
  const medicationItems = state.medications.map((medication) => {
    const barrierText = medication.activeBarriers.length > 0 ? ` Barriers: ${medication.activeBarriers.join(", ")}.` : " No barriers marked.";
    return `${medication.name} ${medication.dose} ${medication.schedule}.${barrierText}`;
  });
  const confirmedInstructions = state.extractedFacts.filter((fact) => fact.status === "confirmed").map((fact) => fact.value);

  return {
    id: "brief-current",
    patientId: state.patient.id,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "What I am working on",
        items: [state.carePlan.plainLanguageSummary],
        status: "confirmed"
      },
      {
        title: "Recent home readings",
        items: recentReadings.length > 0 ? recentReadings : ["No home readings logged yet."],
        status: recentReadings.length > 0 ? "patient_reported" : "needs_review"
      },
      {
        title: "Medicines and barriers",
        items: medicationItems,
        status: "patient_reported"
      },
      {
        title: "Confirmed instructions",
        items: confirmedInstructions.length > 0 ? confirmedInstructions : ["No uploaded instructions confirmed yet."],
        status: confirmedInstructions.length > 0 ? "confirmed" : "needs_review"
      },
      {
        title: "Questions for my care team",
        items: ["What should I do if readings stay above my call threshold?", "Are any medicine side effects expected or concerning?", "What number pattern should make me call sooner?"],
        status: "inferred"
      }
    ]
  };
}
```

- [ ] **Step 3: Build Health Brief component**

Create `src/components/health-brief-card.tsx`:

```tsx
import type { HealthBrief } from "@/domain/types";

export function HealthBriefCard({ brief }: { brief: HealthBrief }) {
  return (
    <article className="rounded-control border border-ink/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My Health Brief</h2>
          <p className="text-sm text-ink/65">Generated {new Date(brief.generatedAt).toLocaleString()}</p>
        </div>
        <button className="rounded-control border border-care px-3 py-2 text-sm font-semibold text-care" onClick={() => window.print()} type="button">
          Print
        </button>
      </div>
      <div className="mt-4 grid gap-4">
        {brief.sections.map((section) => (
          <section key={section.title} className="border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{section.title}</h3>
              <span className="rounded-control bg-calm px-2 py-1 text-xs font-medium text-care">{section.status.replace("_", " ")}</span>
            </div>
            <ul className="mt-2 grid gap-1 text-sm leading-6">
              {section.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
```

Create `src/components/health-brief-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildHealthBrief } from "@/domain/health-brief";
import { demoState } from "@/domain/fixtures";
import { HealthBriefCard } from "./health-brief-card";

describe("HealthBriefCard", () => {
  it("renders the compiled sections", () => {
    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);

    expect(screen.getByText("My Health Brief")).toBeInTheDocument();
    expect(screen.getByText("Medicines and barriers")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Render visits screen**

Modify `src/app/visits/page.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app-shell";
import { HealthBriefCard } from "@/components/health-brief-card";
import { buildHealthBrief } from "@/domain/health-brief";
import { useHealthState } from "@/state/store";

export default function VisitsPage() {
  const { state } = useHealthState();
  const brief = buildHealthBrief(state);

  return (
    <AppShell title="My Visits">
      <div className="grid gap-5">
        <section>
          <h2 className="text-xl font-semibold">Prepare a better care conversation</h2>
          <p className="mt-1 text-sm leading-6 text-ink/75">Review this before your appointment, show it on your phone, or print it.</p>
        </section>
        <HealthBriefCard brief={brief} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/domain/health-brief.test.ts src/components/health-brief-card.test.tsx`

Expected: PASS.

```bash
git add src/domain/health-brief.ts src/domain/health-brief.test.ts src/components/health-brief-card.tsx src/components/health-brief-card.test.tsx src/app/visits/page.tsx
git commit -m "feat: add visit health brief"
```

---

### Task 13: Privacy, Export, Delete, and Access Log

**Files:**
- Create: `src/components/privacy-panel.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/state/store.tsx`
- Test: `src/components/privacy-panel.test.tsx`

**Interfaces:**
- Consumes: `AppState`, `AuditEvent`, `clearStoredState`
- Produces: visible access log, JSON export, demo data reset

- [ ] **Step 1: Add delete action to reducer**

Modify `src/state/store.tsx` action union:

```ts
export type HealthAction =
  | { type: "addReading"; reading: HomeReading }
  | { type: "setMedicationBarriers"; medicationId: string; barriers: MedicationBarrier[] }
  | { type: "addContextItem"; item: CareContextItem; facts: ExtractedFact[] }
  | { type: "confirmFact"; factId: string }
  | { type: "addAiMessage"; message: AiMessage }
  | { type: "addAuditEvent"; event: AuditEvent }
  | { type: "resetDemo" };
```

Reducer already returns `demoState` for `resetDemo`; keep that behavior.

- [ ] **Step 2: Test privacy panel**

Create `src/components/privacy-panel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoState } from "@/domain/fixtures";
import { PrivacyPanel } from "./privacy-panel";

describe("PrivacyPanel", () => {
  it("shows privacy commitments and export control", () => {
    render(<PrivacyPanel state={demoState} onReset={() => undefined} />);

    expect(screen.getByText("No ads. No data monetization.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export my data" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement privacy panel**

Create `src/components/privacy-panel.tsx`:

```tsx
"use client";

import type { AppState } from "@/domain/types";

export function PrivacyPanel({ state, onReset }: { state: AppState; onReset: () => void }) {
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "home-health-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-control border border-care/20 bg-calm p-4">
        <h2 className="text-xl font-semibold">Your data promise</h2>
        <p className="mt-2 text-sm leading-6">No ads. No data monetization. Sharing is patient-controlled. This prototype stores demo data in this browser.</p>
      </section>
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Controls</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-control bg-care px-4 py-2 text-sm font-semibold text-white" onClick={exportData} type="button">
            Export my data
          </button>
          <button className="rounded-control border border-pulse px-4 py-2 text-sm font-semibold text-pulse" onClick={onReset} type="button">
            Delete demo data
          </button>
        </div>
      </section>
      <section className="rounded-control border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Access log</h2>
        {state.auditEvents.length === 0 ? <p className="mt-2 text-sm text-ink/70">No activity recorded yet.</p> : null}
        <ul className="mt-3 grid gap-2 text-sm leading-6">
          {state.auditEvents.slice().reverse().map((event) => (
            <li key={event.id}>
              <strong>{event.label}</strong> - {event.action} - {new Date(event.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Render privacy page**

Modify `src/app/privacy/page.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/app-shell";
import { PrivacyPanel } from "@/components/privacy-panel";
import { clearStoredState } from "@/state/storage";
import { useHealthState } from "@/state/store";

export default function PrivacyPage() {
  const { state, dispatch } = useHealthState();

  return (
    <AppShell title="Privacy">
      <PrivacyPanel
        state={state}
        onReset={() => {
          clearStoredState();
          dispatch({ type: "resetDemo" });
        }}
      />
    </AppShell>
  );
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/components/privacy-panel.test.tsx src/state/store.test.ts`

Expected: PASS.

```bash
git add src/components/privacy-panel.tsx src/components/privacy-panel.test.tsx src/app/privacy/page.tsx src/state/store.tsx
git commit -m "feat: add privacy controls"
```

---

### Task 14: End-to-End Flow and Accessibility Pass

**Files:**
- Create: `e2e/home-health.spec.ts`
- Modify: pages or components only when tests reveal specific failures
- Create: `README.md`

**Interfaces:**
- Consumes: completed app surfaces
- Produces: browser-verified patient journey and local run documentation

- [ ] **Step 1: Write Playwright happy path**

Create `e2e/home-health.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("patient logs BP, captures a barrier, asks coach, and views Health Brief", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await page.getByRole("link", { name: "My Numbers" }).click();
  await page.getByLabel("Top number").fill("151");
  await page.getByLabel("Bottom number").fill("92");
  await page.getByLabel("Pulse").fill("72");
  await page.getByLabel("Morning").check();
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByText("Rest quietly for 5 minutes")).toBeVisible();

  await page.getByRole("link", { name: "My Medicines" }).click();
  await page.getByLabel("It costs too much").check();

  await page.getByRole("link", { name: "Coach" }).click();
  await page.getByRole("button", { name: "Why does this matter?" }).click();
  await page.getByLabel("Message").fill("Why am I taking lisinopril?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/Lisinopril/)).toBeVisible();

  await page.getByRole("link", { name: "My Visits" }).click();
  await expect(page.getByText("My Health Brief")).toBeVisible();
  await expect(page.getByText("Medicines and barriers")).toBeVisible();
});
```

- [ ] **Step 2: Add README**

Create `README.md`:

```md
# Home Health AI Ownership App

Mobile-first v0.1 prototype for patient-owned hypertension care at home.

## What it does

- Helps a patient understand a hypertension care plan.
- Logs home blood pressure readings.
- Explains medicines in plain language.
- Captures medication barriers without shame.
- Provides guided AI coaching with safety boundaries.
- Generates a visit-ready Health Brief.
- Shows privacy controls, export, delete, and audit log foundations.

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

Open `http://127.0.0.1:3000/today`.

## Verification

```bash
npm run test
npm run build
npm run test:e2e
```

## AI posture

The app uses a mock AI provider by default. Real AI provider integration requires privacy, security, clinical safety, and regulatory review before sending patient health data outside the browser.
```

- [ ] **Step 3: Run full checks**

Run: `npm run test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npm run test:e2e`

Expected: PASS in desktop and mobile projects.

- [ ] **Step 4: Commit**

```bash
git add e2e README.md
git commit -m "test: add home health ownership journey"
```

---

### Task 15: Final Product Review and Release Notes

**Files:**
- Create: `docs/v0.1-release-notes.md`
- Modify: `docs/superpowers/specs/2026-07-05-home-health-ai-ownership-app-design.md` only if implementation reveals a spec mismatch

**Interfaces:**
- Consumes: completed implementation, tests, and spec
- Produces: launch notes and proof checklist

- [ ] **Step 1: Create release notes**

Create `docs/v0.1-release-notes.md`:

```md
# v0.1 Release Notes - Home Health AI Ownership

## Shipped

- Mobile-first Today action feed.
- Hypertension care plan view.
- Home blood pressure logging.
- Blood pressure interpretation tied to the patient plan.
- Medication purpose cards.
- Medication barrier capture.
- Care instruction intake and confirmation.
- Guided AI coach with safety gate.
- Visit prep Health Brief.
- Privacy controls, export, delete, and access log foundations.

## Safety boundary

- The app explains, coaches, organizes, reminds, summarizes, and routes to care.
- The app does not diagnose, prescribe, change medications, or independently make treatment decisions.
- External AI calls are off by default.

## Verification

- `npm run test`
- `npm run build`
- `npm run test:e2e`

## Known limits

- Local demo persistence only.
- Mock AI provider only.
- No authentication.
- No production PHI storage.
- No EMR/FHIR integration.
- No clinician dashboard.
```

- [ ] **Step 2: Run final verification**

Run: `npm run check`

Expected: lint, unit tests, and production build pass.

Run: `npm run test:e2e`

Expected: browser journey passes.

- [ ] **Step 3: Commit**

```bash
git add docs/v0.1-release-notes.md
git commit -m "docs: add v0.1 release notes"
```

---

## Self-Review

Spec coverage:

- Product thesis and EMR-agnostic posture: Tasks 1, 6, 14.
- Hypertension first wedge: Tasks 2, 3, 8.
- Today, My Plan, My Numbers, My Medicines, My Visits: Tasks 6 through 12.
- AI interpreter, coach, and compiler: Tasks 4, 10, 11, 12.
- Conversational AI modes: Task 11.
- AI-powered instructions and confirmation: Task 10.
- Evidence/facts/plans/output separation: Tasks 2, 5, 10, 12.
- Safety and regulatory posture: Tasks 3, 4, 11, 14, 15.
- Privacy and trust: Tasks 5, 13, 15.
- MVP scope: Tasks 1 through 15.

Placeholder scan:

- The plan contains no unresolved implementation markers.
- Each implementation task has concrete files, interfaces, test commands, and commit commands.

Type consistency:

- `AppState`, `CarePlan`, `Medication`, `HomeReading`, `TaskItem`, `AiMessage`, `HealthBrief`, and reducer action names are defined before use.
- `buildTodayTasks`, `interpretBloodPressure`, `classifySafety`, `createSafeAiResponse`, `extractInstructionFacts`, and `buildHealthBrief` are named consistently across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-home-health-ai-ownership-app.md`.

Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.

Choose the execution approach before implementation begins.
