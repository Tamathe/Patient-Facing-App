import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useReducer } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { brentState } from "@/domain/fixtures";
import { caseyFamilyState, morganFamilyState } from "@/domain/family-fixtures";
import type { AppState, FamilyNavigatorState } from "@/domain/types";
import { healthReducer } from "@/state/store";
import { FamilyExperience } from "@/components/family-experience";

const { push, requestFamilyInterview } = vi.hoisted(() => ({ push: vi.fn(), requestFamilyInterview: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/ai/family-interview-provider", () => ({ requestFamilyInterview }));

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function withFamily(family: FamilyNavigatorState | null, language: "en" | "es" = "en"): AppState {
  return { ...brentState, patient: { ...brentState.patient, language }, family };
}

function ReducerHarness({ initialState = withFamily(null) }: { initialState?: AppState }) {
  const [state, dispatch] = useReducer(healthReducer, initialState);
  return (
    <>
      <FamilyExperience state={state} dispatch={dispatch} passcode="demo-passcode" />
      <output data-testid="family-state">{JSON.stringify(state.family)}</output>
      <output data-testid="adult-facts">{JSON.stringify(state.extractedFacts)}</output>
      <output data-testid="audit-events">{JSON.stringify(state.auditEvents)}</output>
    </>
  );
}

beforeEach(() => {
  push.mockReset();
  requestFamilyInterview.mockReset();
  requestFamilyInterview.mockResolvedValue(null);
});

describe("FamilyExperience", () => {
  it("synchronizes the document language and restores the prior value on unmount", () => {
    const originalLanguage = document.documentElement.lang;
    document.documentElement.lang = "fr";
    const { rerender, unmount } = render(
      <FamilyExperience state={withFamily(morganFamilyState, "es")} dispatch={vi.fn()} passcode="" />
    );

    expect(document.documentElement.lang).toBe("es");
    rerender(<FamilyExperience state={withFamily(morganFamilyState, "en")} dispatch={vi.fn()} passcode="" />);
    expect(document.documentElement.lang).toBe("en");
    unmount();
    expect(document.documentElement.lang).toBe("fr");
    document.documentElement.lang = originalLanguage;
  });

  it("does not steal focus for a persisted interview from an earlier visit", () => {
    const persistedFamily: FamilyNavigatorState = {
      ...morganFamilyState,
      interviews: [
        {
          id: "persisted-interview",
          rawText: "Riley is in fourth grade.",
          source: "typed",
          createdAt: "2026-07-16T12:00:00.000Z",
          extraction: "mock"
        }
      ],
      facts: [
        {
          id: "persisted-fact",
          interviewId: "persisted-interview",
          label: "Grade",
          value: "fourth grade",
          status: "patient_reported",
          sourceSnippet: "fourth grade"
        }
      ]
    };

    render(<FamilyExperience state={withFamily(persistedFamily)} dispatch={vi.fn()} passcode="" />);

    expect(screen.getByRole("heading", { name: "Review what we heard" }).closest("section")).not.toHaveFocus();
  });

  it("runs the Morgan mock path with atomic family facts, confirmation, deterministic Scott-first resources, saved return state, and timeline", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness />);

    expect(screen.getByText(/Demo.*fictional data/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Morgan and Riley.*Scott County/ }));
    expect(screen.queryByRole("link", { name: /Answer a few questions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Tell us about your child/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Prefer simple questions/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { name: "What support would help?" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/What would you like help with/i)).toHaveValue(morganFamilyState.interviewDraft);
    const adultFactsBefore = screen.getByTestId("adult-facts").textContent;

    await user.click(screen.getByRole("button", { name: "Find support areas" }));
    await screen.findByRole("heading", { name: "Review what we heard" });
    expect(screen.getByRole("heading", { name: "Review what we heard" }).closest("section")).toHaveFocus();
    expect(screen.getByRole("heading", { name: "What has the school offered so far?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Nothing yet" })).toBeVisible();
    expect(screen.getByTestId("matched-family-resources")).toBeVisible();
    expect(requestFamilyInterview).toHaveBeenCalledWith(expect.objectContaining({ passcode: "demo-passcode" }));
    expect(screen.getByTestId("adult-facts").textContent).toBe(adultFactsBefore);

    const stateAfterCrunch = JSON.parse(screen.getByTestId("family-state").textContent || "null") as FamilyNavigatorState;
    expect(stateAfterCrunch.interviews).toHaveLength(1);
    expect(stateAfterCrunch.facts).toHaveLength(3);
    expect(stateAfterCrunch.facts.every(({ interviewId }) => interviewId === stateAfterCrunch.interviews[0].id)).toBe(true);
    expect(stateAfterCrunch.facts.map(({ label, status }) => ({ label, status }))).toEqual([
      { label: "Grade", status: "patient_reported" },
      { label: "Reported diagnosis", status: "patient_reported" },
      { label: "School concern", status: "inferred" }
    ]);
    expect(stateAfterCrunch.activeDomains).toEqual(["school_iep", "waivers_financial", "parent_support"]);

    await user.click(screen.getAllByRole("button", { name: /Confirm this detail/ })[0]);
    await waitFor(() => expect(screen.getByText("Confirmed by you")).toBeVisible());
    const stateAfterConfirm = JSON.parse(screen.getByTestId("family-state").textContent || "null") as FamilyNavigatorState;
    expect(stateAfterConfirm.facts.filter(({ status }) => status === "confirmed")).toHaveLength(1);

    const matched = screen.getByTestId("matched-family-resources");
    const resourceCards = within(matched).getAllByTestId("family-resource-card");
    expect(resourceCards[0]).toHaveAttribute("data-resource-id", "scott_county_exceptional_child_services");
    const resourceIds = resourceCards.map((card) => card.getAttribute("data-resource-id"));
    expect(resourceIds).toContain("child_waiver");
    expect(new Set(resourceIds).size).toBe(resourceIds.length);
    const source = within(resourceCards[0]).getByRole("link", { name: /Open source link.*Scott County Schools/i });
    expect(source).toHaveAttribute(
      "href",
      "https://www.scott.kyschools.us/departments/student-learning/exceptional-child-services/special-education"
    );
    expect(source).toHaveAttribute("target", "_blank");

    const nearby = screen.getByRole("region", { name: "Nearby therapeutic recreation" });
    expect(within(nearby).getByTestId("family-resource-card")).toHaveAttribute(
      "data-resource-id",
      "central_kentucky_riding_for_hope"
    );
    expect(screen.getAllByText("Central Kentucky Riding for Hope")).toHaveLength(1);
    expect(stateAfterCrunch.activeDomains).not.toContain("recreation");

    await user.click(screen.getByRole("button", { name: "Nothing yet" }));
    await screen.findByRole("heading", { name: "Have you applied for any state programs yet?" });
    const stateAfterFirstFollowUp = JSON.parse(
      screen.getByTestId("family-state").textContent || "null"
    ) as FamilyNavigatorState;
    expect(stateAfterFirstFollowUp.interviews).toHaveLength(2);
    expect(stateAfterFirstFollowUp.interviews[1].rawText).toBe(`${morganFamilyState.interviewDraft}\nNothing yet`);
    expect(screen.getByTestId("matched-family-resources")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Not yet" }));
    await screen.findByText("Thanks. We have enough to orient your next steps.");
    expect(screen.queryByRole("heading", { name: "Who can take over for a few hours?" })).not.toBeInTheDocument();
    const stateAfterSecondFollowUp = JSON.parse(
      screen.getByTestId("family-state").textContent || "null"
    ) as FamilyNavigatorState;
    expect(stateAfterSecondFollowUp.interviews).toHaveLength(3);
    expect(stateAfterSecondFollowUp.interviews[2].rawText).toBe(
      `${morganFamilyState.interviewDraft}\nNothing yet\nNot yet`
    );

    const currentMatched = screen.getByTestId("matched-family-resources");
    const currentScottCard = within(currentMatched).getAllByTestId("family-resource-card")[0];
    await user.click(within(currentScottCard).getByRole("button", { name: /Save.*Scott County Schools/i }));
    const saved = screen.getByRole("region", { name: "Saved resources" });
    expect(within(saved).getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();
    expect(
      screen
        .getAllByTestId("family-resource-card")
        .filter((card) => card.getAttribute("data-resource-id") === "scott_county_exceptional_child_services")
    ).toHaveLength(1);
    expect(within(saved).queryByRole("button", { name: /Share.*Scott County Schools/i })).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Now" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Next" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Later" })).toBeVisible();
    expect(screen.getByText("Timing is shown early because only the birth year is known.")).toBeVisible();
  });

  it("keeps the simple needs screen collapsed until requested and preserves its eight-question path", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness initialState={withFamily(morganFamilyState)} />);

    const disclosure = screen.getByRole("button", { name: /Prefer simple questions/i });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { name: "What support would help?" })).not.toBeInTheDocument();

    await user.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("heading", { name: "What support would help?" })).toBeVisible();

    const yesAnswers = screen.getAllByRole("radio", { name: "Yes" });
    expect(yesAnswers).toHaveLength(8);
    for (const answer of yesAnswers) {
      await user.click(answer);
    }
    await user.click(screen.getByRole("button", { name: "See support areas" }));

    const family = JSON.parse(screen.getByTestId("family-state").textContent || "null") as FamilyNavigatorState;
    expect(family.screenAnswers).toHaveLength(8);
    expect(family.activeDomains).toEqual([
      "early_intervention",
      "therapies",
      "school_iep",
      "waivers_financial",
      "respite",
      "parent_support",
      "sibling_support",
      "transportation"
    ]);
  });

  it("does not attach a late Morgan extraction after the family is reseeded to Casey", async () => {
    const user = userEvent.setup();
    const pending = deferred<null>();
    requestFamilyInterview.mockReturnValueOnce(pending.promise);
    render(<ReducerHarness initialState={withFamily(morganFamilyState)} />);

    await user.click(screen.getByRole("button", { name: "Find support areas" }));
    await user.click(screen.getByRole("button", { name: /Casey.*Perry County/ }));
    const stateAfterReseed = JSON.parse(
      screen.getByTestId("family-state").textContent || "null"
    ) as FamilyNavigatorState;
    expect(stateAfterReseed.profile?.county).toBe("Perry");
    expect(stateAfterReseed.interviews).toEqual([]);

    await act(async () => pending.resolve(null));
    await waitFor(() =>
      expect(screen.getByLabelText("What would you like help with?")).toHaveValue(caseyFamilyState.interviewDraft)
    );
    const stateAfterLateResponse = JSON.parse(
      screen.getByTestId("family-state").textContent || "null"
    ) as FamilyNavigatorState;
    expect(stateAfterLateResponse.profile?.county).toBe("Perry");
    expect(stateAfterLateResponse.interviews).toEqual([]);
    expect(stateAfterLateResponse.facts).toEqual([]);
    expect(stateAfterLateResponse.activeDomains).toEqual([]);
  });

  it("resets an active follow-up thread when the family is reseeded", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness initialState={withFamily(morganFamilyState)} />);

    await user.click(screen.getByRole("button", { name: "Find support areas" }));
    await screen.findByRole("heading", { name: "What has the school offered so far?" });
    await user.click(screen.getByRole("button", { name: /Casey.*Perry County/ }));

    expect(screen.getByLabelText("What would you like help with?")).toHaveValue(caseyFamilyState.interviewDraft);
    expect(screen.queryByRole("heading", { name: "What has the school offered so far?" })).not.toBeInTheDocument();
  });

  it("uses exact fallback resources only for an honest domain zero-match, not for no selected domains", () => {
    const profile = { ...morganFamilyState.profile!, county: "Boone" };
    const zeroMatchFamily: FamilyNavigatorState = {
      ...morganFamilyState,
      profile,
      activeDomains: ["transportation"]
    };
    const { rerender } = render(
      <FamilyExperience state={withFamily(zeroMatchFamily)} dispatch={vi.fn()} passcode="" />
    );

    const fallback = screen.getByRole("region", { name: "No exact local match yet" });
    expect(within(fallback).getAllByTestId("family-resource-card").map((card) => card.getAttribute("data-resource-id"))).toEqual([
      "ky_spin",
      "hdi_resource_guide",
      "kynect_resources",
      "kentucky_211"
    ]);

    rerender(
      <FamilyExperience
        state={withFamily({ ...zeroMatchFamily, activeDomains: [] })}
        dispatch={vi.fn()}
        passcode=""
      />
    );
    expect(screen.queryByRole("region", { name: "No exact local match yet" })).not.toBeInTheDocument();
  });

  it("shows an honest localized timeline empty state when a profile has no current stage entries", () => {
    const family: FamilyNavigatorState = {
      ...morganFamilyState,
      profile: {
        ...morganFamilyState.profile!,
        birthMonth: 1,
        diagnoses: [],
        schoolStage: "elementary"
      }
    };
    render(<FamilyExperience state={withFamily(family)} dispatch={vi.fn()} passcode="" />);

    expect(screen.getByText("No planning moments match the current profile yet.")).toBeVisible();
  });

  it("requires consent for sharing, writes one shared audit event, and sinks enrolled resources without urgency", async () => {
    const user = userEvent.setup();
    const family: FamilyNavigatorState = {
      ...morganFamilyState,
      activeDomains: ["waivers_financial"]
    };
    render(<ReducerHarness initialState={withFamily(family)} />);

    const michelle = screen.getByTestId("matched-family-resources").querySelector(
      '[data-resource-id="michelle_p_waiver"]'
    ) as HTMLElement;
    expect(within(michelle).getByText(/date ordered/i)).toBeVisible();
    const share = within(michelle).getByRole("button", { name: /Share.*Michelle P/i });
    expect(share).toBeDisabled();
    await user.click(within(michelle).getByRole("checkbox"));
    await user.click(share);
    await waitFor(() => {
      const audit = JSON.parse(screen.getByTestId("audit-events").textContent || "[]") as Array<{ action: string; label: string }>;
      expect(audit.filter(({ action, label }) => action === "shared" && label.includes("Michelle P."))).toHaveLength(1);
    });

    await user.click(within(michelle).getByRole("button", { name: /Mark as already receiving.*Michelle P/i }));
    await waitFor(() => expect(within(michelle).queryByText(/date ordered/i)).not.toBeInTheDocument());
    const orderedCards = within(screen.getByTestId("matched-family-resources")).getAllByTestId("family-resource-card");
    expect(orderedCards.at(-1)).toHaveAttribute("data-resource-id", "michelle_p_waiver");
  });

  it("keeps enrolled CHILD visible after the four unenrolled waiver choices and suppresses its urgency", () => {
    const family: FamilyNavigatorState = {
      ...morganFamilyState,
      activeDomains: ["waivers_financial"],
      alreadyEnrolled: ["child_waiver"]
    };
    render(<FamilyExperience state={withFamily(family)} dispatch={vi.fn()} passcode="" />);

    const matched = screen.getByTestId("matched-family-resources");
    const cards = within(matched).getAllByTestId("family-resource-card");
    const ids = cards.map((card) => card.getAttribute("data-resource-id"));
    expect(ids).toContain("child_waiver");
    expect(ids.at(-1)).toBe("child_waiver");
    const child = matched.querySelector('[data-resource-id="child_waiver"]') as HTMLElement;
    expect(within(child).getByText("Already receiving this")).toBeVisible();
    expect(within(child).queryByText(/Why to act now/i)).not.toBeInTheDocument();
  });

  it("does not duplicate CKRH when recreation is primary and hides therapeutic recreation outside age or county", () => {
    const recreationFamily: FamilyNavigatorState = {
      ...morganFamilyState,
      activeDomains: ["recreation"]
    };
    const { rerender } = render(
      <FamilyExperience state={withFamily(recreationFamily)} dispatch={vi.fn()} passcode="" />
    );

    expect(screen.getAllByText("Central Kentucky Riding for Hope")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Nearby therapeutic recreation" })).not.toBeInTheDocument();

    rerender(
      <FamilyExperience
        state={withFamily({
          ...morganFamilyState,
          profile: { ...morganFamilyState.profile!, birthYear: 2024, birthMonth: 1 },
          activeDomains: ["school_iep"]
        })}
        dispatch={vi.fn()}
        passcode=""
      />
    );
    expect(screen.queryByRole("region", { name: "Nearby therapeutic recreation" })).not.toBeInTheDocument();

    rerender(
      <FamilyExperience
        state={withFamily({
          ...morganFamilyState,
          profile: { ...morganFamilyState.profile!, county: "Boone" },
          activeDomains: ["school_iep"]
        })}
        dispatch={vi.fn()}
        passcode=""
      />
    );
    expect(screen.queryByRole("region", { name: "Nearby therapeutic recreation" })).not.toBeInTheDocument();
  });

  it("renders substantive localized Spanish mock facts, rationales, resources, and source-language notice", async () => {
    const user = userEvent.setup();
    const spanishFamily: FamilyNavigatorState = {
      ...morganFamilyState,
      interviewDraft:
        "Mi hija está en cuarto grado en Georgetown. A mi hija le diagnosticaron dislexia y TDAH hace un par de meses. La tarea de lectura es una batalla cada noche y no sé qué pedirle a la escuela. El dinero está escaso y sigo escuchando sobre exenciones, pero no tengo idea de por dónde empezar."
    };
    render(<ReducerHarness initialState={withFamily(spanishFamily, "es")} />);

    expect(screen.getByTestId("family-experience")).toHaveAttribute("lang", "es");
    expect(screen.getByText(/pendiente de revisi.*hablante nativ/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Buscar.*reas de apoyo/i }));
    await screen.findByRole("heading", { name: /Revisa lo que entendimos/i });
    expect(screen.getByRole("heading", { name: "¿Qué ha ofrecido la escuela hasta ahora?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Nada todavía" })).toBeVisible();
    expect(screen.getByText("Grado")).toBeVisible();
    expect(screen.getAllByText("cuarto grado")[0]).toBeVisible();
    expect(screen.getByText("Diagnóstico informado")).toBeVisible();
    expect(screen.getByText("dislexia y TDAH")).toBeVisible();
    expect(screen.getByText("Preocupación escolar")).toBeVisible();
    expect(screen.getByText(/La persona cuidadora describió necesidades de apoyo escolar/)).toBeVisible();
    expect(screen.getByText(/detalles proporcionados por las organizaciones.*idioma original/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();
  });

  it("clears review and resource presentation before a safety redirect", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness initialState={withFamily({ ...morganFamilyState, activeDomains: ["school_iep"] })} />);

    expect(screen.getByTestId("matched-family-resources")).toBeVisible();
    const interview = screen.getByLabelText("What would you like help with?");
    await user.clear(interview);
    await user.type(interview, "honestly she's been saying she wants to die");
    await user.click(screen.getByRole("button", { name: "Find support areas" }));

    expect(push).toHaveBeenCalledWith(`/chat?ask=${encodeURIComponent("honestly she's been saying she wants to die")}`);
    expect(screen.queryByTestId("matched-family-resources")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Review what we heard" })).not.toBeInTheDocument();
  });

  it("suppresses review and resources when a follow-up answer triggers safety escalation", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness initialState={withFamily(morganFamilyState)} />);

    await user.click(screen.getByRole("button", { name: "Find support areas" }));
    await screen.findByRole("heading", { name: "What has the school offered so far?" });
    expect(screen.getByTestId("matched-family-resources")).toBeVisible();

    const crisisText = "I am going to kill myself tonight";
    await user.type(screen.getByRole("textbox", { name: "Or type a short answer" }), crisisText);
    await user.click(screen.getByRole("button", { name: "Add answer" }));

    expect(push).toHaveBeenCalledWith(`/chat?ask=${encodeURIComponent(crisisText)}`);
    expect(requestFamilyInterview).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("matched-family-resources")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Review what we heard" })).not.toBeInTheDocument();
  });
});
