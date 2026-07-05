import { expect, test } from "@playwright/test";

test("patient logs BP, captures a barrier, asks coach, and views Health Brief", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "My Numbers" }).click();
  await expect(page.getByRole("heading", { name: "My Numbers" })).toBeVisible();
  await page.getByLabel("Top number").fill("151");
  await page.getByLabel("Bottom number").fill("92");
  await page.getByLabel("Pulse").fill("72");
  await page.getByLabel("Morning").check();
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByText("Rest quietly for 5 minutes")).toBeVisible();

  await page.getByRole("link", { name: "My Medicines" }).click();
  await expect(page.getByRole("heading", { name: "My Medicines" })).toBeVisible();
  await page.getByLabel("It costs too much").check();
  await expect(page.getByRole("checkbox", { name: "It costs too much" })).toBeChecked();

  await page.getByRole("link", { name: "Coach" }).click();
  await expect(page.getByRole("heading", { name: "Coach" })).toBeVisible();
  await page.getByRole("button", { name: "Why does this matter?" }).click();
  await page.getByLabel("Message").fill("Why am I taking lisinopril?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/Lisinopril is listed in your medicines as/i)).toBeVisible();

  await page.getByRole("link", { name: "My Visits" }).click();
  await expect(page.getByRole("heading", { name: "My Health Brief" })).toBeVisible();

  const readingsSection = page.getByRole("heading", { name: "Recent home readings" });
  await expect(readingsSection).toBeVisible();
  await expect(readingsSection.locator("..").locator("..").getByText("151/92")).toBeVisible();

  const medicationSection = page.getByRole("heading", { name: "Medicines and barriers" });
  await expect(medicationSection).toBeVisible();
  await expect(medicationSection.locator("..").locator("..").getByText(/Barriers:|It costs too much|cost/i)).toBeVisible();
});
