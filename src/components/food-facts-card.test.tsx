import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { FoodFactsCard } from "./food-facts-card";
import type { FoodFlag } from "@/domain/food-flags";
import type { IdentifiedFood } from "@/domain/types";

const soup: IdentifiedFood = {
  id: "051000012616",
  barcode: "051000012616",
  name: "Chicken Noodle Soup",
  brand: "Campbell's",
  category: "Soups",
  nutrition: {
    servingSize: "1/2 cup",
    calories: 60,
    sodiumMg: 890,
    potassiumMg: 100,
    totalSugarsG: 1,
    addedSugarsG: 0,
    saturatedFatG: 0.5,
    fiberG: 1,
    proteinG: 3,
    carbsG: 8
  },
  source: "barcode_seed"
};

const flags: FoodFlag[] = [{ id: "nutrient-sodiumMg", severity: "warning", text: "890 mg sodium — 59% of your 1500 mg daily limit" }];

describe("FoodFactsCard", () => {
  it("renders the food name and flags", () => {
    render(<FoodFactsCard food={soup} flags={flags} logged={false} canLog onLog={() => {}} language="en" />);
    expect(screen.getByText("Campbell's Chicken Noodle Soup")).toBeInTheDocument();
    expect(screen.getByText(/890 mg sodium/)).toBeInTheDocument();
  });

  it("calls onLog when the log button is pressed", async () => {
    const onLog = vi.fn();
    const user = userEvent.setup();
    render(<FoodFactsCard food={soup} flags={flags} logged={false} canLog onLog={onLog} language="en" />);
    await user.click(screen.getByRole("button", { name: "Log this" }));
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it("shows the logged confirmation instead of the button", () => {
    render(<FoodFactsCard food={soup} flags={flags} logged canLog onLog={() => {}} language="en" />);
    expect(screen.getByText("Added to your meals")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log this" })).not.toBeInTheDocument();
  });

  it("shows the estimate badge for vision-estimated food", () => {
    render(
      <FoodFactsCard
        food={{ ...soup, source: "vision_estimate" }}
        flags={[]}
        logged={false}
        canLog
        onLog={() => {}}
        language="en"
      />
    );
    expect(screen.getByText("Estimate from photo")).toBeInTheDocument();
  });

  it("renders Spanish strings", () => {
    render(<FoodFactsCard food={soup} flags={[]} logged={false} canLog onLog={() => {}} language="es" />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });
});
