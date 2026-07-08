import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MenuPage from "./page";

const mockValues = vi.hoisted(() => ({
  dispatch: vi.fn(),
  replace: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockValues.replace })
}));

vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return {
    useHealthState: () => ({
      state: demoState,
      dispatch: mockValues.dispatch
    })
  };
});

describe("MenuPage", () => {
  beforeEach(() => {
    mockValues.dispatch.mockClear();
    mockValues.replace.mockClear();
  });

  it("lets the phone user reset the demo into the eye-screening walkthrough", () => {
    render(<MenuPage />);

    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));

    expect(mockValues.dispatch).toHaveBeenCalledWith({ type: "resetDemo" });
    expect(mockValues.replace).toHaveBeenCalledWith("/screening?entry=sms");
  });
});
