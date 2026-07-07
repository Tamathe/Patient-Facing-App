import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

const mockValues = vi.hoisted(() => ({
  language: "en" as "en" | "es",
  dispatch: vi.fn(),
  replace: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockValues.replace })
}));

vi.mock("@/state/storage", () => ({
  markOnboardingComplete: vi.fn()
}));

vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return {
    useHealthState: () => ({
      state: { ...demoState, patient: { ...demoState.patient, language: mockValues.language } },
      dispatch: mockValues.dispatch
    })
  };
});

describe("OnboardingPage", () => {
  beforeEach(() => {
    mockValues.language = "en";
    mockValues.dispatch.mockClear();
    mockValues.replace.mockClear();
  });

  it("does not show persistent urgent help in the startup chrome", () => {
    render(<OnboardingPage />);

    expect(screen.queryByText(/feeling unsafe right now/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /988/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /911/i })).not.toBeInTheDocument();
  });

  it("lets Spanish users choose their health focus instead of skipping onboarding", () => {
    mockValues.language = "es";

    render(<OnboardingPage />);

    expect(mockValues.replace).not.toHaveBeenCalledWith("/today");
    expect(screen.getByRole("heading", { name: /quieres ayuda/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^pres/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^az/i })).toBeInTheDocument();
  });
});
