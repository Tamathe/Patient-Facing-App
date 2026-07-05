import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { demoState } from "@/domain/fixtures";
import { PrivacyPanel } from "./privacy-panel";

type URLExports = typeof URL & {
  createObjectURL: () => string;
  revokeObjectURL: (value: string) => void;
};

describe("PrivacyPanel", () => {
  it("shows patient-facing privacy commitments", () => {
    render(<PrivacyPanel state={demoState} onReset={() => undefined} />);

    expect(screen.getByText("No ads. No data monetization.")).toBeInTheDocument();
    expect(screen.getByText(/You control what you share/i)).toBeInTheDocument();
    expect(screen.getByText(/browser storage/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export my data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete demo data" })).toBeInTheDocument();
  });

  it("exports patient data as JSON using the browser download flow", () => {
    const originalCreateObjectURL = (URL as URLExports).createObjectURL;
    const originalRevokeObjectURL = (URL as URLExports).revokeObjectURL;
    const createObjectURL = vi.fn().mockReturnValue("blob:home-health-data");
    const revokeObjectURL = vi.fn();

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<PrivacyPanel state={demoState} onReset={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Export my data" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:home-health-data");

    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL
      });
    } else {
      Reflect.deleteProperty(URL, "createObjectURL");
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL
      });
    } else {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }

    anchorClick.mockRestore();
  });

  it("calls the reset handler when delete is clicked", () => {
    const onReset = vi.fn();

    render(<PrivacyPanel state={demoState} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete demo data" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows the access log newest first and handles empty history", () => {
    const state = {
      ...demoState,
      auditEvents: [
        {
          id: "event-1",
          patientId: demoState.patient.id,
          action: "created",
          label: "Readings uploaded",
          createdAt: "2026-07-05T10:00:00.000Z"
        },
        {
          id: "event-2",
          patientId: demoState.patient.id,
          action: "exported",
          label: "Export created",
          createdAt: "2026-07-05T11:00:00.000Z"
        }
      ]
    };

    const { rerender } = render(<PrivacyPanel state={state} onReset={() => undefined} />);
    const listItems = screen.getAllByRole("listitem");

    expect(listItems[0]).toHaveTextContent("Export created");
    expect(listItems[1]).toHaveTextContent("Readings uploaded");

    rerender(<PrivacyPanel state={{ ...demoState, auditEvents: [] }} onReset={() => undefined} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});
