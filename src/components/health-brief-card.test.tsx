import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { buildHealthBrief } from "@/domain/health-brief";
import { demoState } from "@/domain/fixtures";
import { HealthBriefCard } from "./health-brief-card";

describe("HealthBriefCard", () => {
  it("renders and exports the patient-reported screenings section", async () => {
    const user = userEvent.setup();
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: share
    });
    const state = {
      ...demoState,
      assessmentEvents: [
        {
          id: "phq9-brief",
          patientId: demoState.patient.id,
          instrumentId: "phq9",
          itemResponses: [1, 1, 1, 1, 1, 1, 1, 0, 0],
          totalScore: 7,
          severityBand: "mild",
          status: "patient_reported" as const,
          recordedAt: "2026-07-12T12:00:00.000Z"
        }
      ]
    };

    try {
      render(
        <HealthBriefCard brief={buildHealthBrief(state, { generatedAt: "2026-07-20T12:00:00.000Z" })} />
      );
      const heading = screen.getByRole("heading", { name: "Check-ins and screenings", level: 3 });
      const section = heading.closest("section");
      expect(section).not.toBeNull();
      expect(within(section as HTMLElement).getByText("patient reported", { exact: true })).toBeVisible();
      expect(within(section as HTMLElement).getByText(/Mood check-in \(PHQ-9\): 7/)).toBeVisible();

      await user.click(await screen.findByRole("button", { name: /share/i }));
      expect(share).toHaveBeenCalledWith({
        title: "My Health Brief",
        text: expect.stringContaining("Check-ins and screenings\nStatus: patient reported")
      });
    } finally {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        writable: true,
        value: previousShare
      });
    }
  });

  it("renders the compiled sections", () => {
    render(<HealthBriefCard brief={buildHealthBrief(demoState)} />);

    expect(screen.getByText("My Health Brief")).toBeInTheDocument();
    expect(screen.getByText("Medicines and barriers")).toBeInTheDocument();
  });

  it("uses Web Share API when available", async () => {
    const user = userEvent.setup();
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;
    const onShare = vi.fn();

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined)
    });

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} onShare={onShare} />);
    await user.click(await screen.findByRole("button", { name: /share/i }));

    expect(window.navigator.share).toHaveBeenCalledWith({
      title: "My Health Brief",
      text: expect.stringContaining("When to call my care team")
    });
    expect(onShare).toHaveBeenCalledTimes(1);

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: previousShare
    });
  });

  it("uses a current timestamp for shared text when generatedAt is invalid", async () => {
    const user = userEvent.setup();
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;
    const share = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: share
    });

    try {
      render(<HealthBriefCard brief={buildHealthBrief(demoState, { generatedAt: "" })} />);
      await user.click(await screen.findByRole("button", { name: /share/i }));
      const sharedText = share.mock.calls[0]?.[0]?.text as string | undefined;

      expect(sharedText).toContain("Generated ");
      expect(sharedText).toContain("When to call my care team");
      expect(sharedText).not.toContain("Generated Not available yet");
    } finally {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        writable: true,
        value: previousShare
      });
    }
  });

  it("does not download when share is unavailable after cancellation", async () => {
    const user = userEvent.setup();
    const previousShare = (window.navigator as { share?: () => Promise<void> }).share;
    const createObjectURL = typeof URL.createObjectURL === "function"
      ? vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:health-brief")
      : undefined;
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const onDownload = vi.fn();
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: vi.fn().mockRejectedValue(new DOMException("Share was cancelled", "AbortError"))
    });

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} onDownload={onDownload} />);
    await user.click(await screen.findByRole("button", { name: /share/i }));

    expect(window.navigator.share).toHaveBeenCalledWith({
      title: "My Health Brief",
      text: expect.stringContaining("When to call my care team")
    });
    expect(anchorClick).not.toHaveBeenCalled();
    expect(onDownload).not.toHaveBeenCalled();
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
    const onDownload = vi.fn();

    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      writable: true,
      value: undefined
    });

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    if (createObjectURL) {
      expect(createObjectURL).toHaveBeenCalled();
    }
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
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

  it("records print when the print action is used", () => {
    const onPrint = vi.fn();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});

    render(<HealthBriefCard brief={buildHealthBrief(demoState)} onPrint={onPrint} />);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));

    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
