import { expect, test, type Page } from "@playwright/test";
import { demoState } from "../src/domain/fixtures";
import { GAD2_INSTRUMENT } from "../src/domain/instruments/gad2";
import { HUNGER_VITAL_SIGN_INSTRUMENT } from "../src/domain/instruments/hunger-vital-sign";
import { LUNG_LDCT_ELIGIBILITY_INSTRUMENT } from "../src/domain/instruments/lung-ldct-eligibility";
import { NIDA_SINGLE_INSTRUMENT } from "../src/domain/instruments/nida-single";
import { PHQ2_INSTRUMENT } from "../src/domain/instruments/phq2";
import { PHQ9_INSTRUMENT } from "../src/domain/instruments/phq9";
import { TOBACCO_USE_INSTRUMENT } from "../src/domain/instruments/tobacco-use";

const STORAGE_KEY = "home-health-ai-ownership-state";
const CLEAR_GUARD = "__screening_e2e_cleared";
const PRE_SPRINT_PHQ9_ID = "pre-sprint-phq9";
const seededState = {
  ...demoState,
  assessmentEvents: [
    {
      id: PRE_SPRINT_PHQ9_ID,
      patientId: demoState.patient.id,
      instrumentId: "phq9",
      itemResponses: [1, 1, 1, 1, 1, 1, 1, 0, 0],
      totalScore: 7,
      severityBand: "mild",
      status: "patient_reported" as const,
      recordedAt: "2025-07-01T12:00:00.000Z"
    }
  ]
};

async function startInstrument(page: Page): Promise<void> {
  const start = page.getByRole("button", { name: /^I understand.*start/i });
  await expect(start).toBeVisible();
  await expect(start).toBeEnabled();
  await start.click();
}

async function choose(page: Page, question: string, answer: string): Promise<void> {
  await page.getByRole("group", { name: question }).getByRole("radio", { name: answer, exact: true }).check();
}

async function submitAndContinue(page: Page): Promise<void> {
  const submit = page.getByRole("button", { name: "Submit", exact: true });
  await expect(submit).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
}

async function completeNegativePhq2(page: Page): Promise<void> {
  await startInstrument(page);
  for (const item of PHQ2_INSTRUMENT.items) {
    await choose(page, item.en, "Not at all");
  }
  await submitAndContinue(page);
}

async function completeNegativeGad2(page: Page): Promise<void> {
  await startInstrument(page);
  for (const item of GAD2_INSTRUMENT.items) {
    await choose(page, item.en, "Not at all");
  }
  await submitAndContinue(page);
}

async function completeNegativeFoodCheck(page: Page): Promise<void> {
  await startInstrument(page);
  for (const item of HUNGER_VITAL_SIGN_INSTRUMENT.items) {
    await choose(page, item.en, "Never true");
  }
  await submitAndContinue(page);
}

async function completeNidaZero(page: Page): Promise<void> {
  await startInstrument(page);
  await page.getByRole("spinbutton", { name: NIDA_SINGLE_INSTRUMENT.items[0].en }).fill("0");
  await submitAndContinue(page);
}

async function waitForAssessmentCount(page: Page, minimum: number): Promise<void> {
  await expect.poll(async () => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw) as { assessmentEvents?: unknown[] };
    return parsed.assessmentEvents?.length ?? 0;
  }, STORAGE_KEY)).toBeGreaterThanOrEqual(minimum);
}

test("screening hub golden path persists quick checks, crisis routing, lung eligibility, and Health Brief provenance", async ({ page }) => {
  await page.addInitScript(
    ([storageKey, guardKey, initialState]) => {
      if (window.sessionStorage.getItem(guardKey) !== "true") {
        window.localStorage.removeItem(storageKey);
        window.localStorage.setItem(storageKey, JSON.stringify(initialState));
        window.sessionStorage.setItem(guardKey, "true");
      }
    },
    [STORAGE_KEY, CLEAR_GUARD, seededState] as const
  );

  await page.goto("/checkin");
  const initialDue = page.getByRole("region", { name: "Due now" });
  await expect(initialDue.getByRole("link", { name: /PHQ-9 mood check-in/i })).toHaveAttribute(
    "href",
    "/checkin/phq9"
  );
  await page.getByRole("link", { name: "Start the 2-minute check", exact: true }).click();

  await completeNegativePhq2(page);
  await completeNegativeGad2(page);
  await completeNegativeFoodCheck(page);
  await startInstrument(page);
  await choose(page, TOBACCO_USE_INSTRUMENT.items[0].en, "Not at all");
  await choose(page, TOBACCO_USE_INSTRUMENT.items[1].en, "No");
  await submitAndContinue(page);
  await completeNidaZero(page);
  await expect(
    page.getByText("Nothing you reported needs follow-up today. This is a check-in, not a diagnosis.", { exact: true })
  ).toBeVisible();
  await waitForAssessmentCount(page, 6);

  await page.goto("/checkin/quick");
  await startInstrument(page);
  await choose(page, PHQ2_INSTRUMENT.items[0].en, "More than half the days");
  await choose(page, PHQ2_INSTRUMENT.items[1].en, "Several days");
  await submitAndContinue(page);
  await startInstrument(page);
  for (const [index, item] of PHQ9_INSTRUMENT.items.entries()) {
    await choose(page, item.en, index === PHQ9_INSTRUMENT.items.length - 1 ? "Several days" : "Not at all");
  }
  const crisisSubmit = page.getByRole("button", { name: "Submit", exact: true });
  await expect(crisisSubmit).toBeVisible();
  await expect(crisisSubmit).toBeEnabled();
  await crisisSubmit.click();
  await expect(page.getByRole("link", { name: /Call 988/ })).toHaveAttribute("href", "tel:988");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).not.toBeVisible();
  await expect(page.getByText(/Nothing you reported needs follow-up today/)).not.toBeVisible();
  await waitForAssessmentCount(page, 8);

  await page.goto("/checkin/quick");
  await completeNegativePhq2(page);
  await completeNegativeGad2(page);
  await completeNegativeFoodCheck(page);
  await startInstrument(page);
  await choose(page, TOBACCO_USE_INSTRUMENT.items[0].en, "Every day");
  await submitAndContinue(page);
  await completeNidaZero(page);
  await waitForAssessmentCount(page, 13);
  await expect(page.getByRole("heading", { name: "Quit Now Kentucky" })).toBeVisible();
  await page.getByRole("link", { name: "4 quick questions", exact: true }).click();

  await startInstrument(page);
  await page.getByRole("spinbutton", { name: LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items[1].en }).fill("62");
  await page.getByRole("spinbutton", { name: LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items[2].en }).fill("1.5");
  await page.getByRole("spinbutton", { name: LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items[3].en }).fill("20");
  await choose(page, LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items[5].en, "No");
  const lungSubmit = page.getByRole("button", { name: "Submit", exact: true });
  await expect(lungSubmit).toBeVisible();
  await expect(lungSubmit).toBeEnabled();
  await lungSubmit.click();
  await expect(page.getByText(/A yearly low-dose CT scan is recommended for people like you/)).toBeVisible();
  await waitForAssessmentCount(page, 14);

  await page.goto("/checkin");
  await page.reload();
  const history = page.getByRole("region", { name: "History" });
  await expect(history.getByText("PHQ-9 mood check-in", { exact: true }).first()).toBeVisible();
  await expect(history.getByText("Lung screening eligibility", { exact: true }).first()).toBeVisible();
  const persistedAssessmentIds = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) as { assessmentEvents?: Array<{ id?: unknown }> } : {};
    return parsed.assessmentEvents?.flatMap(({ id }) => typeof id === "string" ? [id] : []) ?? [];
  }, STORAGE_KEY);
  expect(persistedAssessmentIds).toContain(PRE_SPRINT_PHQ9_ID);

  await page.goto("/visits");
  const screeningsHeading = page.getByRole("heading", { name: "Check-ins and screenings", level: 3 });
  await expect(screeningsHeading).toBeVisible();
  await expect(screeningsHeading.locator("..").getByText("patient reported", { exact: true })).toBeVisible();
});
