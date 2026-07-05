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
    render(<PrivacyPanel state={demoState} onReset={() => undefined} onExport={() => undefined} />);

    expect(screen.getByText("No ads. No data monetization.")).toBeInTheDocument();
    expect(screen.getByText(/You control what you share/i)).toBeInTheDocument();
    expect(screen.getByText(/browser storage/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export my data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete demo data" })).toBeInTheDocument();
  });

  it("calls the export handler when export is clicked", () => {
    const onExport = vi.fn();

    render(<PrivacyPanel state={demoState} onReset={() => undefined} onExport={onExport} />);
    fireEvent.click(screen.getByRole("button", { name: "Export my data" }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("exports JSON file with the browser download flow in the parent", () => {
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
    const onExport = vi.fn().mockImplementation(() => {
      const payload = JSON.stringify(demoState, null, 2);
      const file = new Blob([payload], { type: "application/json" });
      const canCreateObjectURL = typeof URL.createObjectURL === "function";
      const href = canCreateObjectURL
        ? URL.createObjectURL(file)
        : `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`;
      const link = document.createElement("a");

      link.href = href;
      link.download = `home-health-data-${demoState.patient.id}.json`;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (canCreateObjectURL) {
        URL.revokeObjectURL(href);
      }
    });

    render(<PrivacyPanel state={demoState} onReset={() => undefined} onExport={onExport} />);
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

    render(<PrivacyPanel state={demoState} onReset={onReset} onExport={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete demo data" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows readable action labels and sorts newest entries first", () => {
    const state = {
      ...demoState,
      auditEvents: [
        {
          id: "event-1",
          patientId: demoState.patient.id,
          action: "created",
          label: "created",
          createdAt: "2026-07-05T10:00:00.000Z"
        },
        {
          id: "event-2",
          patientId: demoState.patient.id,
          action: "ai_generated",
          label: "ai_generated",
          createdAt: "2026-07-05T11:00:00.000Z"
        }
      ]
    };

    const { rerender } = render(
      <PrivacyPanel state={state} onReset={() => undefined} onExport={() => undefined} />
    );
    const listItems = screen.getAllByRole("listitem");

    expect(listItems[0]).toHaveTextContent("AI response generated");
    expect(listItems[1]).toHaveTextContent("Data created");

    rerender(<PrivacyPanel state={{ ...demoState, auditEvents: [] }} onReset={() => undefined} onExport={() => undefined} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});

