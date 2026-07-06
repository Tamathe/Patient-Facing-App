import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { PhoneFrame } from "./phone-frame";

describe("PhoneFrame", () => {
  it("renders a 390px bezel around its children", () => {
    render(
      <PhoneFrame>
        <p>Demo content</p>
      </PhoneFrame>
    );

    const content = screen.getByText("Demo content");
    const bezel = content.parentElement;
    expect(bezel).toHaveClass("w-[390px]", "border-8", "border-ink");
  });
});
