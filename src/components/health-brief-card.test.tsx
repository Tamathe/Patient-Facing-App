import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { buildHealthBrief } from "@/domain/health-brief";
import { demoState } from "@/domain/fixtures";
import { HealthBriefCard } from "./health-brief-card";

describe("HealthBriefCard", () => {
  it("renders the compiled sections", () => {
    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);

    expect(screen.getByText("My Health Brief")).toBeInTheDocument();
    expect(screen.getByText("Medicines and barriers")).toBeInTheDocument();
  });
});
