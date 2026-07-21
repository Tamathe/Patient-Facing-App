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

type BasicsInput = {
  county: string;
  birthYear: string;
  birthMonth?: string;
  schoolStage?: string;
  childFirstName?: string;
  diagnoses?: Array<{ name: string; month?: string }>;
  language?: "en" | "es";
};

// The navigator no longer ships fictional example shortcuts, so each journey
// builds its profile through the same basics form a caregiver would use.
async function openBasics(page: Page, language: "en" | "es" = "en"): Promise<void> {
  const disclosure = page.getByRole("button", {
    name: language === "es" ? /Cuéntanos lo básico/ : /Tell us the basics/
  });
  if ((await disclosure.getAttribute("aria-expanded")) === "false") {
    await disclosure.click();
  }
}

async function fillBasics(page: Page, basics: BasicsInput): Promise<void> {
  const spanish = basics.language === "es";
  await openBasics(page, spanish ? "es" : "en");
  await page.getByLabel(spanish ? "Condado de Kentucky" : "Kentucky county").selectOption(basics.county);
  await page.getByLabel(spanish ? "Año de nacimiento" : "Birth year").fill(basics.birthYear);
  if (basics.birthMonth) {
    await page.getByLabel(spanish ? "Mes de nacimiento" : "Birth month").selectOption(basics.birthMonth);
  }
  if (basics.schoolStage) {
    await page.getByLabel(spanish ? "Etapa escolar" : "School stage").selectOption(basics.schoolStage);
  }
  if (basics.childFirstName) {
    await page
      .getByLabel(spanish ? "Primer nombre del niño o niña (opcional)" : "Child's first name (optional)")
      .fill(basics.childFirstName);
  }
  for (const { name, month } of basics.diagnoses ?? []) {
    await page.getByRole("checkbox", { name }).check();
    if (month) {
      await page.getByLabel(`${name} diagnosis month (optional)`).fill(month);
    }
  }
  await page.getByRole("button", { name: spanish ? "Guardar estos datos" : "Save these details" }).click();
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

  await expect(page.getByRole("heading", { name: "Help for your family", level: 1 })).toBeVisible();
  await expect(page.getByText(/Demo.*not an official service/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tell us what is going on" })).toBeVisible();
  await fillBasics(page, {
    county: "Scott",
    birthYear: "2017",
    schoolStage: "elementary",
    childFirstName: "Riley",
    diagnoses: [
      { name: "Dyslexia", month: "2026-05" },
      { name: "ADHD", month: "2026-05" }
    ]
  });
  const interview = page.getByLabel("What would you like help with?");
  await interview.fill(MORGAN_PARAGRAPH);
  await page.getByRole("button", { name: "Find help" }).click();

  expect(capturedRequests).toHaveLength(1);
  expect(capturedRequests[0].method).toBe("POST");
  expect(new URL(capturedRequests[0].url).search).toBe("");
  expect(capturedRequests[0].body).toMatchObject({
    text: MORGAN_PARAGRAPH,
    passcode: "demo-passcode",
    language: "en"
  });

  const review = page.getByRole("region", { name: "Here is what we heard" });
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
  await expect(schoolConcern).toContainText("Our guess — please check");
  await expect(review.getByText("School and IEP", { exact: true })).toBeVisible();
  await expect(review.getByText("Waivers and financial support", { exact: true })).toBeVisible();
  await expect(review.getByText("Parent support", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: /Yes, that is right/ }).first().click();
  await expect(review.getByText("You said this is right")).toBeVisible();

  const matched = page.getByTestId("matched-family-resources");
  const cards = matched.locator("[data-family-resource-card]");
  await expect(cards.first()).toHaveAttribute("data-resource-id", "scott_county_exceptional_child_services");
  const scottCard = matched.locator('[data-resource-id="scott_county_exceptional_child_services"]');
  const sourceLink = scottCard.getByRole("link", { name: /See their official page.*Scott County Schools/i });
  await expect(sourceLink).toHaveAttribute("href", SCOTT_SOURCE_URL);
  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect(matched.locator('[data-resource-id="child_waiver"]')).toBeVisible();
  await expect(matched.locator('[data-resource-id="central_kentucky_riding_for_hope"]')).toHaveCount(0);
  const nearbyRecreation = page.getByRole("region", { name: "Something else nearby" });
  await expect(
    nearbyRecreation.locator('[data-resource-id="central_kentucky_riding_for_hope"]')
  ).toBeVisible();
  await expect(page.locator('[data-resource-id="central_kentucky_riding_for_hope"]')).toHaveCount(1);

  await scottCard.getByRole("button", { name: /Save.*Scott County Schools/i }).click();
  const savedRegion = page.getByRole("region", { name: "Saved for later" });
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
  await expect(savedRegion.getByRole("button", { name: /we already have this/i })).toHaveCount(0);
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
  await expect(page.getByRole("region", { name: "Here is what we heard" })).not.toBeFocused();

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
  await expect(michelle.getByText("Why it helps to start now")).toBeVisible();
  await michelle.getByRole("button", { name: /We already have this.*Michelle P/i }).click();
  await expect(michelle.getByText("You already have this")).toBeVisible();
  await expect(michelle.getByText("Why it helps to start now")).toHaveCount(0);
  await expect(michelle.getByText(/waiting list is date ordered/i)).toHaveCount(0);
  const resourceIds = await reloadedMatched.locator("[data-family-resource-card]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-resource-id"))
  );
  expect(resourceIds.at(-1)).toBe("michelle_p_waiver");

  await expect(page.getByRole("heading", { name: "Now", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Later", level: 3 })).toBeVisible();
});

test("a two-year-old in Perry County gets the local First Steps POE before statewide options", async ({ page }) => {
  await stubUnconfiguredFamilyInterview(page);
  await page.goto("/family");

  await fillBasics(page, { county: "Perry", birthYear: "2024", birthMonth: "3" });
  await page
    .getByLabel("What would you like help with?")
    .fill("My son is two and barely talking. Someone said to ask about First Steps but I do not know who to call.");
  await page.getByRole("button", { name: "Find help" }).click();

  const cards = page.getByTestId("matched-family-resources").locator("[data-family-resource-card]");
  await expect(cards.nth(0)).toHaveAttribute("data-resource-id", "first_steps_kentucky_river");
  await expect(cards.nth(1)).toHaveAttribute("data-resource-id", "first_steps_statewide");
  await expect(page.getByRole("heading", { name: "Contact First Steps now" })).toBeVisible();
});

test("interview-first path: describing the situation works before any basics, and county unlocks matching", async ({
  page
}) => {
  await stubUnconfiguredFamilyInterview(page);
  await page.goto("/family");

  await expect(page.getByRole("heading", { name: "Tell us what is going on" })).toBeVisible();
  await page
    .getByLabel("What would you like help with?")
    .fill("Reading homework is a nightly battle and I keep hearing about waivers.");
  await page.getByRole("button", { name: "Find help" }).click();

  await expect(page.getByRole("region", { name: "Here is what we heard" })).toBeVisible();
  await expect(page.getByText(/add your county and your child.s birth year below/i)).toBeVisible();
  await expect(page.getByTestId("matched-family-resources")).toHaveCount(0);

  const basics = page.getByRole("button", { name: /Tell us the basics/ });
  await expect(basics).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Kentucky county").selectOption("Scott");
  await page.getByLabel("Birth year").fill("2017");
  await page.getByLabel("School stage").selectOption("elementary");
  await page.getByRole("button", { name: "Save these details" }).click();

  await expect(page.getByText(/add your county and your child.s birth year below/i)).toHaveCount(0);
  await expect(
    page
      .getByTestId("matched-family-resources")
      .locator('[data-resource-id="scott_county_exceptional_child_services"]')
  ).toBeVisible();
});

test("demo timeline control backdates diagnosis data and advances staged nudges without faking the clock", async ({
  page
}) => {
  await page.goto("/family");
  await fillBasics(page, {
    county: "Scott",
    birthYear: "2017",
    schoolStage: "elementary",
    diagnoses: [
      { name: "Dyslexia", month: "2026-05" },
      { name: "ADHD", month: "2026-05" }
    ]
  });
  await page
    .getByLabel("What would you like help with?")
    .fill("Reading homework is a nightly battle and my other kids need attention too. I am exhausted.");
  await page.getByRole("button", { name: "Find help" }).click();

  const timeline = page.getByRole("region", { name: "What to do, and when" });
  await expect(
    timeline.getByRole("region", { name: "Now" }).getByRole("heading", { name: "Talk to another parent" })
  ).toBeVisible();
  await expect(
    timeline
      .getByRole("region", { name: "Next" })
      .getByRole("heading", { name: "Look into help for siblings and a break for you" })
  ).toBeVisible();

  await timeline.getByRole("button", { name: "Demo timeline control" }).click();
  await timeline.getByRole("button", { name: "Set diagnosis dates to this month" }).click();
  await expect(
    timeline.getByRole("region", { name: "Next" }).getByRole("heading", { name: "Talk to another parent" })
  ).toBeVisible();
  await expect(
    timeline
      .getByRole("region", { name: "Later" })
      .getByRole("heading", { name: "Look into help for siblings and a break for you" })
  ).toBeVisible();

  await timeline.getByRole("button", { name: "Set diagnosis dates to 6 months ago" }).click();
  const current = timeline.getByRole("region", { name: "Now" });
  await expect(current.getByRole("heading", { name: "Talk to another parent" })).toBeVisible();
  await expect(current.getByRole("heading", { name: "Look into help for siblings and a break for you" })).toBeVisible();
  await openBasics(page);
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

test("Help for your family is reachable from both Menu and the home composer", async ({ page }) => {
  await page.goto("/menu");

  await page.getByRole("link", { name: /^Help for your family/ }).click();
  await expect(page.getByRole("heading", { name: "Help for your family", level: 1 })).toBeVisible();

  await page.goto("/today");
  await page.getByLabel("Tell me what you need").fill("help for my daughter");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("heading", { name: "Help for your family", level: 1 })).toBeVisible();
});

test(`Safety phrase routes before extraction and locks crisis UI: ${SAFETY_PHRASE}`, async ({ page }) => {
  let familyApiRequests = 0;
  await stubUnconfiguredFamilyInterview(page, () => {
    familyApiRequests += 1;
  });
  await page.goto("/family");

  await page.getByLabel("What would you like help with?").fill(SAFETY_PHRASE);
  await page.getByRole("button", { name: "Find help" }).click();

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
  await fillBasics(page, {
    county: "Scott",
    birthYear: "2017",
    schoolStage: "elementary",
    language: "es"
  });
  const interview = page.getByLabel("¿Con qué te gustaría recibir ayuda?");
  await interview.fill(SPANISH_MORGAN_PARAGRAPH);
  await page.getByRole("button", { name: "Buscar ayuda" }).click();

  expect(capturedRequests).toHaveLength(1);
  expect(capturedRequests[0].method).toBe("POST");
  expect(capturedRequests[0].body).toMatchObject({
    text: SPANISH_MORGAN_PARAGRAPH,
    language: "es"
  });
  const review = page.getByRole("region", { name: "Esto fue lo que entendimos" });
  await expect(review.getByRole("article", { name: "Grado" })).toContainText("cuarto grado");
  await expect(review.getByRole("article", { name: "Diagnóstico informado" })).toContainText(
    "dislexia y TDAH"
  );
  await expect(review.getByRole("article", { name: "Preocupación escolar" })).toBeVisible();
  await expect(
    review.getByText(/Mencionaste la escuela/)
  ).toBeVisible();
  await expect(
    page.getByText(/vienen directo de las organizaciones.*en inglés/i)
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

  await page.getByLabel("¿Con qué te gustaría recibir ayuda?").fill(SPANISH_SAFETY_PHRASE);
  await page.getByRole("button", { name: "Buscar ayuda" }).click();

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
  const interview = page.getByLabel("What would you like help with?");
  await interview.fill("");

  await page.getByRole("button", { name: "Start speaking" }).click();

  await expect(interview).toHaveValue(transcript);
});
