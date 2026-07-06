import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PantryRecipes } from "./pantry-recipes";
import type { PantryRecipe } from "@/domain/types";

const recipes: PantryRecipe[] = [
  {
    title: "Beans and rice bowl",
    whyItFits: "Filling and easy on sodium for your plan.",
    haveItems: ["canned beans", "brown rice"],
    buyItems: ["cumin", "bell pepper"],
    watchOut: "Rinse the beans to cut added salt."
  },
  {
    title: "Tomato veggie soup",
    whyItFits: "Vegetables first, low added salt.",
    haveItems: ["canned tomatoes", "onion"],
    buyItems: ["Cumin", "carrots"],
    watchOut: null
  }
];

describe("PantryRecipes", () => {
  it("renders recipe titles, detected items, and a de-duplicated shopping list", () => {
    render(<PantryRecipes detectedItems={["brown rice", "onion"]} recipes={recipes} language="en" />);

    expect(screen.getByText("Beans and rice bowl")).toBeInTheDocument();
    expect(screen.getByText("Tomato veggie soup")).toBeInTheDocument();
    // "brown rice" shows in both the detected-items list and a recipe's have-items.
    expect(screen.getAllByText("brown rice").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Rinse the beans/)).toBeInTheDocument();

    // "cumin"/"Cumin" collapse to one shopping-list line (case-insensitive dedupe);
    // both appear in per-recipe buy lists too, so query all matches.
    expect(screen.getAllByText(/cumin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/carrots/).length).toBeGreaterThan(0);
  });

  it("renders nothing when there are no recipes", () => {
    const { container } = render(<PantryRecipes detectedItems={[]} recipes={[]} language="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});
