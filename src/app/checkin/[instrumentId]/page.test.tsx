import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/types";
import InstrumentPage from "./page";

const { route, context } = vi.hoisted(() => ({
  route: { instrumentId: "phq9" },
  context: { state: {} as AppState, dispatch: vi.fn() }
}));

vi.mock("next/navigation", () => ({ useParams: () => route }));
vi.mock("@/state/store", () => ({ useHealthState: () => context }));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  )
}));

describe("dynamic instrument route", () => {
  beforeEach(() => {
    route.instrumentId = "phq9";
    context.state = demoState;
  });

  it("loads a known instrument through the generic runner", () => {
    render(<InstrumentPage />);
    expect(screen.getByRole("heading", { name: "PHQ-9 mood check-in" })).toBeVisible();
    expect(screen.getByRole("button", { name: /start the check-in/i })).toBeVisible();
  });

  it("renders a bilingual-safe unavailable state for an unknown id", () => {
    route.instrumentId = "not-real";
    render(<InstrumentPage />);
    expect(screen.getByText("This check-in is not available.")).toBeVisible();
  });
});
