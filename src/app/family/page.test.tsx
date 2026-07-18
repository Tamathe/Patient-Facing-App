import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useReducer } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { brentState } from "@/domain/fixtures";
import { morganFamilyState } from "@/domain/family-fixtures";
import type { AppState, FamilyNavigatorState } from "@/domain/types";
import { healthReducer } from "@/state/store";
import { FamilyExperience } from "@/components/family-experience";

const { push, requestFamilyInterview } = vi.hoisted(() => ({ push: vi.fn(), requestFamilyInterview: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/ai/family-interview-provider", () => ({ requestFamilyInterview }));

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
  it("runs the Morgan mock path with atomic family facts, confirmation, deterministic Scott-first resources, saved return state, and timeline", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness />);

    expect(screen.getByText(/Demo.*fictional data/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Morgan and Riley.*Scott County/ }));
    expect(screen.getByRole("link", { name: /Answer a few questions.*eight support areas/i })).toHaveAttribute(
      "href",
      "#family-screen-title"
    );
    expect(screen.getByRole("link", { name: /Tell us about your child.*Review the words/i })).toHaveAttribute(
      "href",
      "#family-interview-title"
    );
    expect(screen.getByLabelText(/What would you like help with/i)).toHaveValue(morganFamilyState.interviewDraft);
    const adultFactsBefore = screen.getByTestId("adult-facts").textContent;

    await user.click(screen.getByRole("button", { name: "Find support areas" }));
    await screen.findByRole("heading", { name: "Review what we heard" });
    expect(screen.getByRole("heading", { name: "Review what we heard" }).closest("section")).toHaveFocus();
    expect(requestFamilyInterview).toHaveBeenCalledWith(expect.objectContaining({ passcode: "demo-passcode" }));
    expect(screen.getByTestId("adult-facts").textContent).toBe(adultFactsBefore);

    const stateAfterCrunch = JSON.parse(screen.getByTestId("family-state").textContent || "null") as FamilyNavigatorState;
    expect(stateAfterCrunch.interviews).toHaveLength(1);
    expect(stateAfterCrunch.facts).toHaveLength(2);
    expect(stateAfterCrunch.facts.every(({ interviewId }) => interviewId === stateAfterCrunch.interviews[0].id)).toBe(true);
    expect(stateAfterCrunch.facts.every(({ status }) => status === "patient_reported")).toBe(true);
    expect(stateAfterCrunch.activeDomains).toEqual(["school_iep", "waivers_financial", "parent_support"]);

    await user.click(screen.getAllByRole("button", { name: /Confirm this detail/ })[0]);
    await waitFor(() => expect(screen.getByText("Confirmed by you")).toBeVisible());
    const stateAfterConfirm = JSON.parse(screen.getByTestId("family-state").textContent || "null") as FamilyNavigatorState;
    expect(stateAfterConfirm.facts.filter(({ status }) => status === "confirmed")).toHaveLength(1);

    const matched = screen.getByTestId("matched-family-resources");
    const resourceCards = within(matched).getAllByTestId("family-resource-card");
    expect(resourceCards[0]).toHaveAttribute("data-resource-id", "scott_county_exceptional_child_services");
    const source = within(resourceCards[0]).getByRole("link", { name: /Open source link.*Scott County Schools/i });
    expect(source).toHaveAttribute(
      "href",
      "https://www.scott.kyschools.us/departments/student-learning/exceptional-child-services/special-education"
    );
    expect(source).toHaveAttribute("target", "_blank");

    await user.click(within(resourceCards[0]).getByRole("button", { name: /Save.*Scott County Schools/i }));
    const saved = screen.getByRole("region", { name: "Saved resources" });
    expect(within(saved).getByRole("heading", { name: "Scott County Schools Exceptional Child Services" })).toBeVisible();

    expect(screen.getByRole("heading", { name: "Now" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Next" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Later" })).toBeVisible();
    expect(screen.getByText("Timing is shown early because only the birth year is known.")).toBeVisible();
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

    expect(screen.getByText("Add a family profile to see planning moments.")).toBeVisible();
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

  it("renders Spanish-only chrome and suppresses English mock rationales", async () => {
    const user = userEvent.setup();
    render(<ReducerHarness initialState={withFamily(morganFamilyState, "es")} />);

    expect(screen.getByTestId("family-experience")).toHaveAttribute("lang", "es");
    expect(screen.getByText(/pendiente de revisi.*hablante nativ/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Buscar.*reas de apoyo/i }));
    await screen.findByRole("heading", { name: /Revisa lo que entendimos/i });
    expect(screen.queryByText("The caregiver described school, IEP, or reading support needs.")).not.toBeInTheDocument();
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
});
