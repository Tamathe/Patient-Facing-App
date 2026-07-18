import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { morganFamilyState } from "@/domain/family-fixtures";
import { FamilyStageTimeline } from "./family-stage-timeline";

describe("FamilyStageTimeline", () => {
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
});
