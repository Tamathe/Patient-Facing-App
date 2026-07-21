import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { morganFamilyState } from "@/domain/family-fixtures";
import { FamilyStageTimeline } from "./family-stage-timeline";

describe("FamilyStageTimeline", () => {
  it("surfaces diagnosis stages by due month and backdates diagnosis data through an explicit demo control", async () => {
    const user = userEvent.setup();
    const onBackdateDiagnoses = vi.fn();
    const now = new Date("2026-07-17T12:00:00.000Z");
    render(
      <FamilyStageTimeline
        family={morganFamilyState}
        language="en"
        now={now}
        onBackdateDiagnoses={onBackdateDiagnoses}
      />
    );

    const current = screen.getByRole("region", { name: "Now" });
    const next = screen.getByRole("region", { name: "Next" });
    expect(within(current).getByRole("heading", { name: "Connect with another parent" })).toBeVisible();
    expect(within(next).getByRole("heading", { name: "Explore sibling support and respite" })).toBeVisible();

    const disclosure = screen.getByRole("button", { name: "Demo timeline control" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Demo timeline control" })).not.toBeInTheDocument();
    await user.click(disclosure);

    const control = screen.getByRole("group", { name: "Demo timeline control" });
    expect(within(control).getByText(/does not change the device clock/i)).toBeVisible();
    await user.click(within(control).getByRole("button", { name: "Set diagnosis dates to 6 months ago" }));

    expect(onBackdateDiagnoses).toHaveBeenCalledWith(6, now);
  });

  it("does not show diagnosis backdating controls without a diagnosis", () => {
    render(
      <FamilyStageTimeline
        family={{
          ...morganFamilyState,
          profile: { ...morganFamilyState.profile!, diagnoses: [] }
        }}
        language="en"
        now={new Date("2026-07-17T12:00:00.000Z")}
        onBackdateDiagnoses={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Demo timeline control" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Demo timeline control" })).not.toBeInTheDocument();
  });

  it("distinguishes a missing profile from a valid profile with no matching stages", () => {
    const { rerender } = render(
      <FamilyStageTimeline
        family={{ ...morganFamilyState, profile: null }}
        language="en"
        now={new Date("2026-07-17T12:00:00Z")}
      />
    );

    expect(screen.getByText("Add a family profile to see planning moments.")).toBeVisible();

    rerender(
      <FamilyStageTimeline
        family={{
          ...morganFamilyState,
          profile: {
            ...morganFamilyState.profile!,
            birthMonth: 1,
            diagnoses: [],
            schoolStage: "elementary"
          }
        }}
        language="en"
        now={new Date("2026-07-17T12:00:00Z")}
      />
    );

    expect(screen.queryByText("Add a family profile to see planning moments.")).not.toBeInTheDocument();
    expect(screen.getByText("No planning moments match the current profile yet.")).toBeVisible();
  });

  it("links perinatal stages to the caregiver check-in while existing stages stay non-links", () => {
    render(
      <FamilyStageTimeline
        family={{
          ...morganFamilyState,
          profile: {
            childFirstName: "Baby",
            birthYear: 2026,
            birthMonth: 7,
            schoolStage: "not_school_age",
            county: "Scott",
            diagnoses: []
          }
        }}
        language="en"
        now={new Date("2026-07-20T12:00:00.000Z")}
        nudgeFirstName="Jordan"
      />
    );

    expect(screen.getByRole("link", { name: "Start your 1-month check-in" })).toHaveAttribute(
      "href",
      "/checkin/perinatal"
    );
    expect(screen.getByRole("heading", { name: "Contact First Steps now" }).closest("a")).toBeNull();
  });

  it("does not infer perinatal stages from a birth year alone", () => {
    render(
      <FamilyStageTimeline
        family={{
          ...morganFamilyState,
          profile: {
            birthYear: 2026,
            schoolStage: "not_school_age",
            county: "Scott",
            diagnoses: []
          }
        }}
        language="en"
        now={new Date("2026-07-20T12:00:00.000Z")}
        nudgeFirstName="Jordan"
      />
    );

    expect(screen.queryByRole("link", { name: /check-in/i })).not.toBeInTheDocument();
  });
});
