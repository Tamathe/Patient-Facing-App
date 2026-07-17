import { expect, test } from "@playwright/test";
import { brentState } from "../src/domain/fixtures";

const STORAGE_KEY = "home-health-ai-ownership-state";

test("patient logs BP, captures a barrier, asks coach, and views Health Brief", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "All my health" }).click();
  await page.getByRole("link", { name: /^My Numbers/ }).click();
  await expect(page.getByRole("heading", { name: "My Numbers" })).toBeVisible();
  await page.getByLabel("Top number").fill("151");
  await page.getByLabel("Bottom number").fill("92");
  await page.getByLabel("Pulse").fill("72");
  await page.getByLabel("Morning").check();
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByText("Rest quietly for 5 minutes")).toBeVisible();

  await page.getByRole("link", { name: "All my health" }).click();
  await page.getByRole("link", { name: /^My Medicines/ }).click();
  await expect(page.getByRole("heading", { name: "My Medicines" })).toBeVisible();
  await page.getByLabel("It costs too much").check();
  await expect(page.getByRole("checkbox", { name: "It costs too much" })).toBeChecked();

  await page.getByRole("link", { name: "All my health" }).click();
  await page.getByRole("link", { name: /^Coach/ }).click();
  await expect(page.getByRole("heading", { name: "Coach" })).toBeVisible();
  await page.getByRole("button", { name: "Why does this matter?" }).click();
  await page.getByLabel("Message").fill("Why am I taking lisinopril?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/Lisinopril is listed in your medicines as/i)).toBeVisible();

  await page.getByRole("link", { name: "All my health" }).click();
  await page.getByRole("link", { name: /^My Visits/ }).click();
  await expect(page.getByRole("heading", { name: "My Health Brief" })).toBeVisible();

  const readingsSection = page.getByRole("heading", { name: "Recent home readings" });
  await expect(readingsSection).toBeVisible();
  await expect(readingsSection.locator("..").locator("..").getByText("151/92")).toBeVisible();

  const medicationSection = page.getByRole("heading", { name: "Medicines and barriers" });
  await expect(medicationSection).toBeVisible();
  await expect(medicationSection.locator("..").locator("..").getByText(/Barriers:|It costs too much|cost/i)).toBeVisible();
});

test("the collapsed nav reaches a feature through the All my health menu", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/today");
  await page.getByRole("link", { name: "All my health" }).click();
  await expect(page.getByRole("heading", { name: "All my health" })).toBeVisible();

  await page.getByRole("link", { name: /^My Numbers/ }).click();
  await expect(page.getByRole("heading", { name: "My Numbers" })).toBeVisible();
});

test("the home composer routes a spoken-style command to the right screen", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/today");
  await page.getByPlaceholder("Tell me what you need…").fill("show my medicines");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "My Medicines" })).toBeVisible();
});

test("a typed crisis turn shows 988/911 deep links and locks the composer", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/chat");
  await page.getByLabel("Message").fill("I want to die");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByRole("link", { name: /Call 988/ })).toHaveAttribute("href", "tel:988");
  await expect(page.getByRole("link", { name: /Text 988/ })).toHaveAttribute("href", "sms:988");
  await expect(page.getByRole("link", { name: /Call 911/ })).toHaveAttribute("href", "tel:911");

  await expect(page.getByLabel("Message")).toBeDisabled();
  await page.getByRole("button", { name: /seen this/i }).click();
  await expect(page.getByLabel("Message")).not.toBeDisabled();
});

test("a caregiver crisis from home opens crisis chat instead of feature navigation", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/today");
  await page.getByLabel("Tell me what you need").fill("honestly she's been saying she wants to die");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole("link", { name: /Call 988/ })).toHaveAttribute("href", "tel:988");
  await expect(page.getByRole("link", { name: /Call 911/ })).toHaveAttribute("href", "tel:911");
  await expect(page.getByLabel("Message")).toBeDisabled();
});

test("a positive PHQ-9 item 9 routes to the crisis surface", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/checkin");
  await page.getByRole("button", { name: /start the check-in/i }).click();

  // Scope to the question area: the persistent UrgentHelp disclosure in the
  // header is a <details>, whose implicit role is also "group".
  const groups = page.getByRole("main").getByRole("group");
  const count = await groups.count();
  for (let index = 0; index < count; index += 1) {
    const group = groups.nth(index);
    const optionName = index === count - 1 ? "Several days" : "Not at all";
    await group.getByRole("radio", { name: optionName }).check();
  }

  // The sticky bottom nav overlays the bottom-of-page submit on the mobile
  // viewport; dispatch the click straight to the (real, enabled) submit button.
  await page.getByRole("button", { name: "Submit" }).dispatchEvent("click");
  await expect(page.getByRole("link", { name: /Call 988/ })).toHaveAttribute("href", "tel:988");
});

test("the support screen surfaces county-first local resources", async ({ page }) => {
  await page.addInitScript(
    ([key, state]) => window.localStorage.setItem(key as string, JSON.stringify(state)),
    [STORAGE_KEY, brentState] as const
  );

  await page.goto("/support");
  const foodGroup = page.getByRole("group").filter({ hasText: "food would run out" });
  await foodGroup.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: /See support/ }).dispatchEvent("click");

  await expect(page.getByText("Perry County food resources")).toBeVisible();
});

test("the PDC coverage card appears on medicines for the Brent demo", async ({ page }) => {
  await page.addInitScript(
    ([key, state]) => window.localStorage.setItem(key as string, JSON.stringify(state)),
    [STORAGE_KEY, brentState] as const
  );

  await page.goto("/medicines");
  await expect(page.getByRole("heading", { name: "Diabetes medicine coverage" })).toBeVisible();
  await expect(page.getByText(/estimate from refills you logged/)).toBeVisible();
});

test("loading the Brent demo from the privacy page is reachable", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/privacy");
  await expect(page.getByRole("button", { name: /Load Brent demo/ })).toBeVisible();
  await page.getByRole("button", { name: /Load Brent demo/ }).click();
  await expect(page.getByText(/Recorded a skipped metformin dose/i)).toBeVisible();
});
