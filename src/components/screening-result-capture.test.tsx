import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ScreeningResultCapture } from "./screening-result-capture";

async function toInput(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Read my report/ }));
}

function renderCapture(overrides: Partial<React.ComponentProps<typeof ScreeningResultCapture>> = {}) {
  const onConfirm = vi.fn();
  const onSafetyIntercept = vi.fn();
  render(<ScreeningResultCapture language="en" onConfirm={onConfirm} onSafetyIntercept={onSafetyIntercept} {...overrides} />);
  return { onConfirm, onSafetyIntercept };
}

describe("ScreeningResultCapture", () => {
  it("leads with the boundary card — reports only, no diagnosis", () => {
    renderCapture();
    expect(screen.getByText("I read the printed report only — I can't check your eyes or give a diagnosis.")).toBeInTheDocument();
  });

  it("reads a demo report and requires explicit confirmation", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderCapture();

    await toInput(user);
    await user.click(screen.getByRole("button", { name: /report-moderate-npdr/ }));

    expect(screen.getByText("Here's what I read from your report:")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your report shows changes that need a closer look by an eye doctor. This is common and treatable when caught early."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Diabetic retinopathy: Moderate nonproliferative DR/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "That's right" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ grade: "moderate_npdr", dmePresent: false });
    expect(onConfirm.mock.calls[0][1]).toBe("photo_report");
    expect(onConfirm.mock.calls[0][2]).toBe("report-moderate-npdr.svg");
  });

  it("routes 'That's not right' back to input with typed entry preselected", async () => {
    const user = userEvent.setup();
    renderCapture();

    await toInput(user);
    await user.click(screen.getByRole("button", { name: /report-no-dr/ }));
    await user.click(screen.getByRole("button", { name: "That's not right" }));

    expect(screen.getByLabelText("What does the report say?")).toBeInTheDocument();
  });

  it("parses a typed entry through the strict vocabulary", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderCapture();

    await toInput(user);
    await user.click(screen.getByRole("button", { name: "Type it instead" }));
    await user.type(screen.getByLabelText("What does the report say?"), "moderate, no macular edema");
    await user.click(screen.getByRole("button", { name: "Read my entry" }));

    expect(screen.getByText("Macular edema (DME): not detected.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "That's right" }));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ grade: "moderate_npdr", dmePresent: false });
    expect(onConfirm.mock.calls[0][1]).toBe("typed_entry");
  });

  it("refuses unparseable typed text instead of guessing", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderCapture();

    await toInput(user);
    await user.click(screen.getByRole("button", { name: "Type it instead" }));
    await user.type(screen.getByLabelText("What does the report say?"), "my eyes feel fine thanks");
    await user.click(screen.getByRole("button", { name: "Read my entry" }));

    expect(screen.getByText(/I couldn't read that clearly, so I won't guess/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sends crisis text to the safety path, never the parser", async () => {
    const user = userEvent.setup();
    const { onConfirm, onSafetyIntercept } = renderCapture();

    await toInput(user);
    await user.click(screen.getByRole("button", { name: "Type it instead" }));
    await user.type(screen.getByLabelText("What does the report say?"), "I want to die");
    await user.click(screen.getByRole("button", { name: "Read my entry" }));

    expect(onSafetyIntercept).toHaveBeenCalledWith("I want to die");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText("Here's what I read from your report:")).not.toBeInTheDocument();
  });

  it("refuses a retinal photograph by name with the eye-photo copy", async () => {
    const user = userEvent.setup();
    renderCapture();

    await toInput(user);
    const file = new File(["x"], "fundus-left.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Photo of the printed report"), file);

    expect(await screen.findByText(/I can only read the printed report, not eye photos/)).toBeInTheDocument();
  });

  it("refuses an unknown photo as unreadable when no live extractor is configured", async () => {
    const user = userEvent.setup();
    renderCapture();

    await toInput(user);
    const file = new File(["x"], "IMG_2041.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Photo of the printed report"), file);

    expect(await screen.findByText(/I couldn't read that clearly/)).toBeInTheDocument();
  });

  it("uses the live extractor for unknown photos when provided", async () => {
    const user = userEvent.setup();
    const liveExtract = vi.fn().mockResolvedValue({
      grade: "severe_npdr",
      dmePresent: false,
      ungradable: false,
      confidence: "medium",
      fieldsRead: ["Diabetic retinopathy: Severe NPDR"]
    });
    renderCapture({ liveExtract });

    await toInput(user);
    const file = new File(["x"], "IMG_2041.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Photo of the printed report"), file);

    expect(await screen.findByText("Here's what I read from your report:")).toBeInTheDocument();
    expect(liveExtract).toHaveBeenCalledTimes(1);
  });
});
