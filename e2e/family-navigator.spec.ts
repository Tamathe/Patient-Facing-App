import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "home-health-ai-ownership-state";
const FROZEN_NOW = new Date("2026-07-17T12:00:00.000Z");
const MORGAN_PARAGRAPH =
  "My daughter is in fourth grade in Georgetown. She was just diagnosed with dyslexia and ADHD a couple months ago. Reading homework is a nightly battle and I don't know what to ask the school for. Money's tight and I keep hearing about waivers but have no idea where to start.";
const SPANISH_MORGAN_PARAGRAPH =
  "Mi hija está en cuarto grado en Georgetown. A mi hija le diagnosticaron dislexia y TDAH hace un par de meses. La tarea de lectura es una batalla cada noche y no sé qué pedirle a la escuela. El dinero está escaso y sigo escuchando sobre exenciones, pero no tengo idea de por dónde empezar.";
const SAFETY_PHRASE = "honestly she's been saying she wants to die";
const SPANISH_SAFETY_PHRASE = "mi hija dice que quiere morir";
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

type CapturedFamilyRequest = {
  method: string;
  url: string;
  body: unknown;
};

async function stubUnconfiguredFamilyInterview(
  page: Page,
  onRequest?: (request: CapturedFamilyRequest) => void
): Promise<void> {
  await page.route("**/api/family/interview", async (route) => {
    const request = route.request();
    const method = request.method();
    const rawBody = request.postData();
    let body: unknown = null;
    if (method === "POST" && rawBody) {
      try {
        body = JSON.parse(rawBody) as unknown;
      } catch {
        body = rawBody;
      }
    }
    onRequest?.({ method, url: request.url(), body });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mode: "unconfigured", data: null })
    });
  });
}

async function waitForPersistedState(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key) !== null, STORAGE_KEY))
    .toBe(true);
}

async function setPersistedLanguage(page: Page, language: "en" | "es"): Promise<void> {
  await waitForPersistedState(page);
  await page.evaluate(
    ({ key, nextLanguage }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) throw new Error("Expected persisted app state before changing language.");
      const state = JSON.parse(raw) as { patient?: { language?: string } };
      if (!state.patient) throw new Error("Expected a patient profile in persisted app state.");
      state.patient.language = nextLanguage;
      window.localStorage.setItem(key, JSON.stringify(state));
    },
    { key: STORAGE_KEY, nextLanguage: language }
  );
  await page.reload();
}

async function installRepeatedFinalSpeechShim(page: Page, transcript: string): Promise<void> {
  await page.addInitScript((finalTranscript) => {
    class FakeSpeechRecognition {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;

      start(): void {
        const result = Object.assign([{ transcript: finalTranscript }], { isFinal: true });
        const event = { results: [result], resultIndex: 0 };
        window.setTimeout(() => {
          this.onresult?.(event);
          this.onresult?.(event);
        }, 0);
      }

      stop(): void {}
    }

    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, {
        configurable: true,
        value: FakeSpeechRecognition
      });
    }
  }, transcript);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FROZEN_NOW);
  await useFreshStorage(page);
});

test(`Morgan golden path uses the exact paragraph: ${MORGAN_PARAGRAPH}`, async ({ page }) => {
  const capturedRequests: CapturedFamilyRequest[] = [];
  await stubUnconfiguredFamilyInterview(page, (request) => {
    capturedRequests.push(request);
  });
  await page.goto("/family?k=demo-passcode");

  await expect(page.getByRole("heading", { name: "Family navigator", level: 1 })).toBeVisible();
  await expect(page.getByText(/Demo.*fictional data/)).toBeVisible();
  await page.getByRole("button", { name: /Morgan and Riley.*Scott County/ }).click();
  await page.getByRole("link", { name: /Answer a few questions/i }).click();
  await expect(page.getByRole("heading", { name: "What support would help?" })).toBeFocused();
  await page.getByRole("link", { name: /Tell us about your child/i }).click();
  await expect(page.getByRole("heading", { name: "Tell us what is happening" })).toBeFocused();
  const interview = page.getByLabel("What would you like help with?");
  await expect(interview).toHaveValue(MORGAN_PARAGRAPH);
  await page.getByRole("button", { name: "Find support areas" }).click();

  expect(capturedRequests).toHaveLength(1);
  expect(capturedRequests[0].method).toBe("POST");
  expect(new URL(capturedRequests[0].url).search).toBe("");
  expect(capturedRequests[0].body).toMatchObject({
    text: MORGAN_PARAGRAPH,
    passcode: "demo-passcode",
    language: "en"
  });

  const review = page.getByRole("region", { name: "Review what we heard" });
  await expect(review).toBeVisible();
  await expect(review).toBeFocused();
  const gradeFact = review.getByRole("article", { name: "Grade" });
  await expect(gradeFact).toBeVisible();
  await expect(gradeFact.getByRole("paragraph").filter({ hasText: /^fourth grade$/ })).toBeVisible();
  const diagnosisFact = review.getByRole("article", { name: "Reported diagnosis" });
  await expect(diagnosisFact).toBeVisible();
  await expect(diagnosisFact.getByRole("paragraph").filter({ hasText: /dyslexia and ADHD/i })).toBeVisible();
  const schoolConcern = review.getByRole("article", { name: "School concern" });
  await expect(schoolConcern).toContainText("Reading and homework may need support");
  await expect(schoolConcern).toContainText("Suggested — please review");
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
  await expect(matched.locator('[data-resource-id="child_waiver"]')).toBeVisible();
  await expect(matched.locator('[data-resource-id="central_kentucky_riding_for_hope"]')).toHaveCount(0);
  const nearbyRecreation = page.getByRole("region", { name: "Nearby therapeutic recreation" });
  await expect(
    nearbyRecreation.locator('[data-resource-id="central_kentucky_riding_for_hope"]')
  ).toBeVisible();
  await expect(page.locator('[data-resource-id="central_kentucky_riding_for_hope"]')).toHaveCount(1);

  await scottCard.getByRole("button", { name: /Save.*Scott County Schools/i }).click();
  const savedRegion = page.getByRole("region", { name: "Saved resources" });
  await expect(savedRegion.getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();
  await expect(page.locator('[data-resource-id="scott_county_exceptional_child_services"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Saved.*Scott County Schools/i })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Share.*Scott County Schools/i })).toHaveCount(1);
  await expect(
    page.getByRole("checkbox", { name: /I agree to share this resource now.*Scott County Schools/i })
  ).toHaveCount(1);
  await expect(savedRegion.locator("[data-family-resource-card]")).toHaveCount(0);
  await expect(savedRegion.getByRole("button", { name: /Share.*Scott County Schools/i })).toHaveCount(0);
  await expect(savedRegion.getByRole("checkbox")).toHaveCount(0);
  await expect(savedRegion.getByRole("button", { name: /already receiving/i })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        const state = raw
          ? (JSON.parse(raw) as { family?: { saved?: Array<{ resourceId?: string }> } })
          : null;
        return (
          state?.family?.saved?.some(
            ({ resourceId }) => resourceId === "scott_county_exceptional_child_services"
          ) ?? false
        );
      }, STORAGE_KEY)
    )
    .toBe(true);
  await page.reload();
  await expect(savedRegion.getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Review what we heard" })).not.toBeFocused();

  const reloadedMatched = page.getByTestId("matched-family-resources");
  const reloadedScott = reloadedMatched.locator('[data-resource-id="scott_county_exceptional_child_services"]');
  await expect(reloadedScott.getByRole("status")).toBeEmpty();
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

test("demo timeline control backdates diagnosis data and advances staged nudges without faking the clock", async ({
  page
}) => {
  await page.goto("/family");
  await page.getByRole("button", { name: /Morgan and Riley.*Scott County/ }).click();

  const timeline = page.getByRole("region", { name: "Right thing at the right time" });
  await expect(
    timeline.getByRole("region", { name: "Now" }).getByRole("heading", { name: "Connect with another parent" })
  ).toBeVisible();
  await expect(
    timeline
      .getByRole("region", { name: "Next" })
      .getByRole("heading", { name: "Explore sibling support and respite" })
  ).toBeVisible();

  await timeline.getByRole("button", { name: "Set diagnosis dates to this month" }).click();
  await expect(
    timeline.getByRole("region", { name: "Next" }).getByRole("heading", { name: "Connect with another parent" })
  ).toBeVisible();
  await expect(
    timeline
      .getByRole("region", { name: "Later" })
      .getByRole("heading", { name: "Explore sibling support and respite" })
  ).toBeVisible();

  await timeline.getByRole("button", { name: "Set diagnosis dates to 6 months ago" }).click();
  const current = timeline.getByRole("region", { name: "Now" });
  await expect(current.getByRole("heading", { name: "Connect with another parent" })).toBeVisible();
  await expect(current.getByRole("heading", { name: "Explore sibling support and respite" })).toBeVisible();
  await expect(page.getByLabel("Dyslexia diagnosis month (optional)")).toHaveValue("2026-01");
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        const state = raw
          ? (JSON.parse(raw) as { family?: { profile?: { diagnoses?: Array<{ diagnosedAt?: string }> } } })
          : null;
        return state?.family?.profile?.diagnoses?.map(({ diagnosedAt }) => diagnosedAt) ?? [];
      }, STORAGE_KEY)
    )
    .toEqual(["2026-01", "2026-01"]);
  expect(await page.evaluate(() => Date.now())).toBe(FROZEN_NOW.valueOf());
});

test("Family Navigator is reachable from both Menu and the home composer", async ({ page }) => {
  await page.goto("/menu");

  await page.getByRole("link", { name: /^Family Navigator/ }).click();
  await expect(page.getByRole("heading", { name: "Family navigator", level: 1 })).toBeVisible();

  await page.goto("/today");
  await page.getByLabel("Tell me what you need").fill("help for my daughter");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Family navigator", level: 1 })).toBeVisible();
});

test(`Safety phrase routes before extraction and locks crisis UI: ${SAFETY_PHRASE}`, async ({ page }) => {
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

test("Spanish mobile mock path is substantive, language-correct, and horizontally contained", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-specific Spanish acceptance coverage.");
  const capturedRequests: CapturedFamilyRequest[] = [];
  await stubUnconfiguredFamilyInterview(page, (request) => {
    capturedRequests.push(request);
  });
  await page.goto("/family");
  await setPersistedLanguage(page, "es");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByRole("button", { name: /Morgan y Riley.*Scott/ }).click();
  const interview = page.getByLabel("¿Con qué te gustaría recibir ayuda?");
  await interview.fill(SPANISH_MORGAN_PARAGRAPH);
  await page.getByRole("button", { name: "Buscar áreas de apoyo" }).click();

  expect(capturedRequests).toHaveLength(1);
  expect(capturedRequests[0].method).toBe("POST");
  expect(capturedRequests[0].body).toMatchObject({
    text: SPANISH_MORGAN_PARAGRAPH,
    language: "es"
  });
  const review = page.getByRole("region", { name: "Revisa lo que entendimos" });
  await expect(review.getByRole("article", { name: "Grado" })).toContainText("cuarto grado");
  await expect(review.getByRole("article", { name: "Diagnóstico informado" })).toContainText(
    "dislexia y TDAH"
  );
  await expect(review.getByRole("article", { name: "Preocupación escolar" })).toBeVisible();
  await expect(
    review.getByText(/La persona cuidadora describió necesidades de apoyo escolar/)
  ).toBeVisible();
  await expect(
    page.getByText(/detalles proporcionados por las organizaciones.*idioma original/i)
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })
  ).toBeVisible();
  await expect(
    page.getByText(/district special-education office and named contacts/i)
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test(`Spanish safety routes before any family API request: ${SPANISH_SAFETY_PHRASE}`, async ({ page }) => {
  let familyApiRequests = 0;
  await stubUnconfiguredFamilyInterview(page, () => {
    familyApiRequests += 1;
  });
  await page.goto("/family");
  await setPersistedLanguage(page, "es");

  await page.getByRole("button", { name: /Morgan y Riley.*Scott/ }).click();
  await page.getByLabel("¿Con qué te gustaría recibir ayuda?").fill(SPANISH_SAFETY_PHRASE);
  await page.getByRole("button", { name: "Buscar áreas de apoyo" }).click();

  await expect(page).toHaveURL(/\/chat(?:\?.*)?$/);
  await expect(page.getByText(/mereces apoyo real de una persona/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Llama al 988/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ya lo vi.*continuar/i })).toBeVisible();
  await expect(page.locator('a[href="tel:988"]')).toBeVisible();
  await expect(page.locator('a[href="sms:988"]')).toBeVisible();
  await expect(page.locator('a[href="tel:911"]')).toBeVisible();
  await expect(page.getByLabel("Message")).toBeDisabled();
  await expect(page.locator("[data-family-resource-card]")).toHaveCount(0);
  expect(familyApiRequests).toBe(0);
});

test("speech recognition ignores a repeated final-result replay", async ({ page }) => {
  const transcript = "reading support from the microphone";
  await installRepeatedFinalSpeechShim(page, transcript);
  await page.goto("/family");
  await page.getByRole("button", { name: /Morgan and Riley.*Scott County/ }).click();
  const interview = page.getByLabel("What would you like help with?");
  await interview.fill("");

  await page.getByRole("button", { name: "Start speaking" }).click();

  await expect(interview).toHaveValue(transcript);
});
