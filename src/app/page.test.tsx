import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import HomePage from "./page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace })
}));

vi.mock("@/state/storage", () => ({
  isOnboardingComplete: () => false
}));

describe("HomePage", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("opens fresh sessions on the Today walkthrough instead of onboarding", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/today");
    });
  });
});
