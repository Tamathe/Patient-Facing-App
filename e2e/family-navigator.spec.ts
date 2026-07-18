import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "home-health-ai-ownership-state";
const MORGAN_PARAGRAPH =
  "My daughter is in fourth grade in Georgetown. She was just diagnosed with dyslexia and ADHD a couple months ago. Reading homework is a nightly battle and I don't know what to ask the school for. Money's tight and I keep hearing about waivers but have no idea where to start.";
const SAFETY_PHRASE = "honestly she's been saying she wants to die";
const SCOTT_SOURCE_URL =
  "https://www.scott.kyschools.us/departments/student-learning/exceptional-child-services/special-education";

async function useFreshStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("__family_e2e_cleared") !== "true") {
      window.localStorage.clear();
      window.sessionStorage.setItem("__family_e2e_cleared", "true");
    }
  });
}

async function stubUnconfiguredFamilyInterview(page: Page, onRequest?: () => void): Promise<void> {
  await page.route("**/api/family/interview", async (route) => {
    onRequest?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mode: "unconfigured", data: null })
    });
  });
}

test(`Morgan golden path uses the exact paragraph: ${MORGAN_PARAGRAPH}`, async ({ page }) => {
  await useFreshStorage(page);
  await stubUnconfiguredFamilyInterview(page);
  await page.goto("/family?k=demo-passcode");

  await expect(page.getByRole("heading", { name: "Family navigator", level: 1 })).toBeVisible();
  await expect(page.getByText("Demo — fictional data")).toBeVisible();
  await page.getByRole("button", { name: /Morgan and Riley.*Scott County/ }).click();
  const interview = page.getByLabel("What would you like help with?");
  await expect(interview).toHaveValue(MORGAN_PARAGRAPH);
  await page.getByRole("button", { name: "Find support areas" }).click();

  const review = page.getByRole("region", { name: "Review what we heard" });
  await expect(review).toBeVisible();
  const gradeFact = review.getByRole("article", { name: "Grade" });
  await expect(gradeFact).toBeVisible();
  await expect(gradeFact.getByRole("paragraph").filter({ hasText: /^fourth grade$/ })).toBeVisible();
  const diagnosisFact = review.getByRole("article", { name: "Reported diagnosis" });
  await expect(diagnosisFact).toBeVisible();
  await expect(diagnosisFact.getByRole("paragraph").filter({ hasText: /dyslexia and ADHD/i })).toBeVisible();
  await expect(review.getByText("School and IEP", { exact: true })).toBeVisible();
  await expect(review.getByText("Waivers and financial support", { exact: true })).toBeVisible();
  await expect(review.getByText("Parent support", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: /Confirm this detail/ }).first().click();
  await expect(review.getByText("Confirmed by you")).toBeVisible();

  const matched = page.getByTestId("matched-family-resources");
  const cards = matched.locator("[data-family-resource-card]");
  await expect(cards.first()).toHaveAttribute("data-resource-id", "scott_county_exceptional_child_services");
  const scottCard = matched.locator('[data-resource-id="scott_county_exceptional_child_services"]');
  const sourceLink = scottCard.getByRole("link", { name: /Open source link.*Scott County Schools/i });
  await expect(sourceLink).toHaveAttribute("href", SCOTT_SOURCE_URL);
  await expect(sourceLink).toHaveAttribute("target", "_blank");

  await scottCard.getByRole("button", { name: /Save.*Scott County Schools/i }).click();
  const savedRegion = page.getByRole("region", { name: "Saved resources" });
  await expect(savedRegion.getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();
  await page.reload();
  await expect(savedRegion.getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();

  const reloadedMatched = page.getByTestId("matched-family-resources");
  const reloadedScott = reloadedMatched.locator('[data-resource-id="scott_county_exceptional_child_services"]');
  await reloadedScott.getByRole("checkbox", { name: /I agree to share this resource now.*Scott County Schools/i }).check();
  await reloadedScott.getByRole("button", { name: /Share.*Scott County Schools/i }).click();
  await expect(reloadedScott.getByText("Share recorded with your consent.")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        const state = raw
          ? (JSON.parse(raw) as { auditEvents?: Array<{ action?: string; label?: string }> })
          : null;
        return (
          state?.auditEvents?.filter(
            ({ action, label }) => action === "shared" && label?.includes("Scott County Schools")
          ).length ?? 0
        );
      }, STORAGE_KEY)
    )
    .toBe(1);

  const michelle = reloadedMatched.locator('[data-resource-id="michelle_p_waiver"]');
  await expect(michelle.getByText("Why to act now")).toBeVisible();
  await michelle.getByRole("button", { name: /Mark as already receiving.*Michelle P/i }).click();
  await expect(michelle.getByText("Already receiving this")).toBeVisible();
  await expect(michelle.getByText("Why to act now")).toHaveCount(0);
  await expect(michelle.getByText(/waiting list is date ordered/i)).toHaveCount(0);
  const resourceIds = await reloadedMatched.locator("[data-family-resource-card]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-resource-id"))
  );
  expect(resourceIds.at(-1)).toBe("michelle_p_waiver");

  await expect(page.getByRole("heading", { name: "Now", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Later", level: 3 })).toBeVisible();
});

test("Casey in Perry County gets the age-2 local First Steps POE before statewide options", async ({ page }) => {
  await useFreshStorage(page);
  await stubUnconfiguredFamilyInterview(page);
  await page.goto("/family");

  await page.getByRole("button", { name: /Casey.*Perry County/ }).click();
  await expect(page.getByLabel("Kentucky county")).toHaveValue("Perry");
  await page.getByRole("button", { name: "Find support areas" }).click();

  const cards = page.getByTestId("matched-family-resources").locator("[data-family-resource-card]");
  await expect(cards.nth(0)).toHaveAttribute("data-resource-id", "first_steps_kentucky_river");
  await expect(cards.nth(1)).toHaveAttribute("data-resource-id", "first_steps_statewide");
  await expect(page.getByRole("heading", { name: "Contact First Steps now" })).toBeVisible();

  await page.getByRole("button", { name: /Morgan and Riley.*Scott County/ }).click();
  await expect(page.getByLabel("Kentucky county")).toHaveValue("Scott");
  await expect(page.getByLabel("What would you like help with?")).toHaveValue(MORGAN_PARAGRAPH);
});

test("Family Navigator is reachable from both Menu and the home composer", async ({ page }) => {
  await useFreshStorage(page);
  await page.goto("/menu");

  await page.getByRole("link", { name: /^Family Navigator/ }).click();
  await expect(page.getByRole("heading", { name: "Family navigator", level: 1 })).toBeVisible();

  await page.goto("/today");
  await page.getByLabel("Tell me what you need").fill("help for my daughter");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Family navigator", level: 1 })).toBeVisible();
});

test(`Safety phrase routes before extraction and locks crisis UI: ${SAFETY_PHRASE}`, async ({ page }) => {
  await useFreshStorage(page);
  let familyApiRequests = 0;
  await stubUnconfiguredFamilyInterview(page, () => {
    familyApiRequests += 1;
  });
  await page.goto("/family");

  await page.getByRole("button", { name: /Morgan and Riley.*Scott County/ }).click();
  await page.getByLabel("What would you like help with?").fill(SAFETY_PHRASE);
  await page.getByRole("button", { name: "Find support areas" }).click();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole("link", { name: /Call 988/ })).toHaveAttribute("href", "tel:988");
  await expect(page.getByRole("link", { name: /Text 988/ })).toHaveAttribute("href", "sms:988");
  await expect(page.getByRole("link", { name: /Call 911/ })).toHaveAttribute("href", "tel:911");
  await expect(page.getByLabel("Message")).toBeDisabled();
  await expect(page.locator("[data-family-resource-card]")).toHaveCount(0);
  expect(familyApiRequests).toBe(0);
});
