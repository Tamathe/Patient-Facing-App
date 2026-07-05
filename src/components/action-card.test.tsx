import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { ActionCard } from "./action-card";

describe("ActionCard", () => {
  it("links to the task destination", () => {
    render(
      <ActionCard
        task={{
          id: "task-1",
          title: "Check blood pressure",
          body: "Log a reading.",
          href: "/numbers",
          priority: 1,
          kind: "reading",
          status: "inferred"
        }}
      />
    );

    expect(screen.getByRole("link", { name: /check blood pressure/i })).toHaveAttribute("href", "/numbers");
    expect(screen.getByText("Helpful guidance from your recent readings.")).toBeInTheDocument();
  });
});
