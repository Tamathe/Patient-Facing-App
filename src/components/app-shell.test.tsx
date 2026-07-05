import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders primary patient-owned navigation", () => {
    render(
      <AppShell title="Today">
        <p>Body</p>
      </AppShell>
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("pb-40", "sm:pb-28");
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: "My Plan" })).toHaveAttribute("href", "/plan");
    expect(screen.getByRole("link", { name: "My Numbers" })).toHaveAttribute("href", "/numbers");
    expect(screen.getByRole("link", { name: "My Medicines" })).toHaveAttribute("href", "/medicines");
  });

  it("renders the page body content in the main region", () => {
    render(
      <AppShell title="Today">
        <p>My temporary page copy</p>
      </AppShell>
    );

    expect(screen.getByText("My temporary page copy")).toBeInTheDocument();
  });
});
