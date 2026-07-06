import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { AppShell } from "./app-shell";

vi.mock("@/state/store", async () => {
  const { demoState } = await vi.importActual<typeof import("@/domain/fixtures")>("@/domain/fixtures");
  return { useHealthState: () => ({ state: demoState, dispatch: () => {} }) };
});

describe("AppShell", () => {
  it("collapses navigation to Home and the All my health menu", () => {
    render(
      <AppShell title="Today">
        <p>Body</p>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: /all my health/i })).toHaveAttribute("href", "/menu");
  });

  it("keeps a persistent, offline-safe crisis affordance on every screen", () => {
    render(
      <AppShell title="Today">
        <p>Body</p>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: /988 — crisis lifeline/i })).toHaveAttribute("href", "tel:988");
    expect(screen.getByRole("link", { name: /911/i })).toHaveAttribute("href", "tel:911");
  });

  it("renders the page body content in the main region", () => {
    render(
      <AppShell title="Today">
        <p>My temporary page copy</p>
      </AppShell>
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("My temporary page copy")).toBeInTheDocument();
  });
});
