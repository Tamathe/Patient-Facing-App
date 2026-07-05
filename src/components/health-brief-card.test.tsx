import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { buildHealthBrief } from "@/domain/health-brief";
import { demoState } from "@/domain/fixtures";
import { HealthBriefCard } from "./health-brief-card";

describe("HealthBriefCard", () => {
  it("renders the compiled sections", () => {
    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);

    expect(screen.getByText("My Health Brief")).toBeInTheDocument();
    expect(screen.getByText("Medicines and barriers")).toBeInTheDocument();
  });

  it("uses Web Share API when available", async () => {
    const user = userEvent.setup();
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined)
    });

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);
    await user.click(screen.getByRole("button", { name: /share/i }));

    expect(window.navigator.share).toHaveBeenCalledWith({
      title: "My Health Brief",
      text: expect.stringContaining("When to call my care team")
    });

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: previousShare
    });
  });

  it("does not download when share is unavailable after cancellation", async () => {
    const user = userEvent.setup();
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;
    const createObjectURL = typeof URL.createObjectURL === "function"
      ? vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:health-brief")
      : undefined;
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: vi.fn().mockRejectedValue(new DOMException("Share was cancelled", "AbortError"))
    });

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);
    await user.click(screen.getByRole("button", { name: /share/i }));

    expect(window.navigator.share).toHaveBeenCalledWith({
      title: "My Health Brief",
      text: expect.stringContaining("When to call my care team")
    });
    expect(anchorClick).not.toHaveBeenCalled();
    if (createObjectURL) {
      expect(createObjectURL).not.toHaveBeenCalled();
    }

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: previousShare
    });
    createObjectURL?.mockRestore();
    anchorClick.mockRestore();
  });

  it("falls back to download when Web Share is not available", () => {
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;
    const createObjectURL = typeof URL.createObjectURL === "function"
      ? vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:health-brief")
      : undefined;
    const revokeObjectURL = typeof URL.revokeObjectURL === "function"
      ? vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
      : undefined;
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const append = vi.spyOn(document.body, "appendChild");
    const remove = vi.spyOn(document.body, "removeChild");

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: undefined
    });

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);
    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    if (createObjectURL) {
      expect(createObjectURL).toHaveBeenCalled();
    }
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: previousShare
    });
    createObjectURL?.mockRestore();
    revokeObjectURL?.mockRestore();
    anchorClick.mockRestore();
    append.mockRestore();
    remove.mockRestore();
  });
});
