import { expect, test } from "@playwright/test";

const SOUP_BARCODE = "051000012616";

async function stubFoodLens(page: import("@playwright/test").Page) {
  await page.addInitScript((barcode) => {
    if (!window.sessionStorage.getItem("__e2e_cleared")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("__e2e_cleared", "1");
    }
    class FakeBarcodeDetector {
      static getSupportedFormats() {
        return Promise.resolve(["ean_13", "upc_a"]);
      }
      detect() {
        return Promise.resolve([{ rawValue: barcode, format: "ean_13" }]);
      }
    }
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = FakeBarcodeDetector;
  }, SOUP_BARCODE);

  await page.route("**/api/realtime/token", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ mode: "mock", reason: "provider_mock" }) })
  );
}

test("scans a food, asks a typed question, logs the meal, and persists it", async ({ page }) => {
  await stubFoodLens(page);

  await page.goto("/today");
  await page.goto("/food");
  await expect(page.getByRole("heading", { name: "Food Lens" })).toBeVisible();

  await expect(page.getByRole("heading", { name: /Chicken Noodle Soup/ })).toBeVisible();
  await expect(page.getByText(/mg sodium/)).toBeVisible();

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Ask about this food…").fill("Can I have this for lunch?");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(page.getByText(/Chicken Noodle Soup/).first()).toBeVisible();
  await expect(page.getByText(/890/).first()).toBeVisible();

  await page.getByRole("button", { name: "Log this" }).click();
  await expect(page.getByText("Added to your meals")).toBeVisible();

  await expect(page.getByRole("listitem").filter({ hasText: "Campbell's Condensed Chicken Noodle Soup" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Campbell's Condensed Chicken Noodle Soup" })).toBeVisible();

  await page.goto("/chat");
  await expect(page.getByText(/Chicken Noodle Soup/).first()).toBeVisible();
});

test("keeps existing state when migrating a pre-mealLog save", async ({ page }) => {
  await stubFoodLens(page);
  await page.addInitScript(() => {
    const legacy = {
      patient: {
        id: "patient-1",
        name: "Legacy Patient",
        preferredName: "Legacy",
        language: "en",
        primaryClinicName: "Bluegrass Primary Care",
        primaryClinicPhone: "555-0142"
      },
      carePlan: {
        id: "plan-1",
        patientId: "patient-1",
        condition: "hypertension",
        plainLanguageSummary: "Keep blood pressure in range.",
        goals: [],
        dailyActions: [],
        callThresholdSystolic: 160,
        callThresholdDiastolic: 100,
        thresholdSource: "clinician_authored",
        warningSymptoms: [],
        nextVisitReason: "Review readings."
      },
      medications: [],
      readings: [
        {
          id: "legacy-reading",
          patientId: "patient-1",
          systolic: 137,
          diastolic: 86,
          pulse: 70,
          measuredAt: "2026-07-01T07:00:00.000Z",
          contexts: ["morning"],
          note: ""
        }
      ],
      tasks: [],
      contextItems: [],
      extractedFacts: [],
      aiMessages: [],
      auditEvents: []
    };
    window.localStorage.setItem("home-health-ai-ownership-state", JSON.stringify(legacy));
  });

  await page.goto("/numbers");
  await expect(page.getByText("137/86")).toBeVisible();

  await page.goto("/food");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Ask about this food…").fill("Is this okay?");
  await page.getByRole("button", { name: "Ask" }).click();
  await page.getByRole("button", { name: "Log this" }).click();
  await expect(page.getByText("Added to your meals")).toBeVisible();
});
