import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import QuickCheckPage from "./page";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main><h1>{title}</h1>{children}</main>
  )
}));
vi.mock("@/components/quick-check", () => ({ QuickCheck: () => <p>Quick flow</p> }));
vi.mock("@/state/store", () => ({ useHealthState: () => ({ state: { patient: { language: "en" } } }) }));

describe("quick check page", () => {
  it("hosts the focused battery flow", () => {
    render(<QuickCheckPage />);
    expect(screen.getByRole("heading", { name: "The 2-minute check" })).toBeVisible();
    expect(screen.getByText("Quick flow")).toBeVisible();
  });
});
