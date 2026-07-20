import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRISIS_ACTIONS } from "@/ai/safety-gate";
import { AUDIT_C_INSTRUMENT } from "@/domain/instruments/audit-c";
import { CRC_ELIGIBILITY_INSTRUMENT } from "@/domain/instruments/crc-eligibility";
import { DDS2_INSTRUMENT } from "@/domain/instruments/dds2";
import { LUNG_LDCT_ELIGIBILITY_INSTRUMENT } from "@/domain/instruments/lung-ldct-eligibility";
import { PHQ9_INSTRUMENT } from "@/domain/instruments/phq9";
import { PREDIABETES_RISK_INSTRUMENT } from "@/domain/instruments/prediabetes-risk";
import { STEADI3_INSTRUMENT } from "@/domain/instruments/steadi3";
import { tSafety } from "@/i18n/strings";
import { InstrumentResult } from "./instrument-result";

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("@/state/store", () => ({
  useHealthState: () => ({
    state: { patient: { id: "patient-1", language: "en" } },
    dispatch
  })
}));

describe("InstrumentResult", () => {
  beforeEach(() => dispatch.mockReset());

  it("records a positive-item event, dispatches the shared crisis message, and replaces the band summary", async () => {
    render(
      <InstrumentResult
        instrument={PHQ9_INSTRUMENT}
        language="en"
        responses={[0, 0, 0, 0, 0, 0, 0, 0, 1]}
      />
    );

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2));
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: "addAssessmentEvent",
      event: {
        patientId: "patient-1",
        instrumentId: "phq9",
        itemResponses: [0, 0, 0, 0, 0, 0, 0, 0, 1],
        totalScore: 1,
        severityBand: "minimal",
        status: "patient_reported"
      }
    });
    expect(dispatch.mock.calls[1][0]).toMatchObject({
      type: "addAiMessage",
      message: {
        role: "assistant",
        content: tSafety("en", "crisisResponse"),
        safety: "crisis",
        actions: CRISIS_ACTIONS
      }
    });
    expect(screen.getByRole("link", { name: /Call 988/i })).toHaveAttribute("href", "tel:988");
    expect(screen.getByRole("link", { name: /Text 988/i })).toHaveAttribute("href", "sms:988");
    expect(screen.getByRole("link", { name: /Call 911/i })).toHaveAttribute("href", "tel:911");
    expect(screen.queryByText(/few or no signs/i)).not.toBeInTheDocument();
  });

  it("records a non-crisis result and renders its localized band summary", async () => {
    render(
      <InstrumentResult
        instrument={PHQ9_INSTRUMENT}
        language="es"
        responses={[0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/pocas o ninguna señal/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /988/i })).not.toBeInTheDocument();
  });

  it("renders the exact bilingual lung eligibility action downstream of the result", () => {
    const { unmount } = render(
      <InstrumentResult
        instrument={LUNG_LDCT_ELIGIBILITY_INSTRUMENT}
        language="en"
        responses={[1, 60, 1, 20, -1, 0]}
      />
    );
    expect(screen.getByText(
      "A yearly low-dose CT scan is recommended for people like you. It's usually covered at no cost — ask your clinic to check and set it up."
    )).toBeVisible();
    unmount();

    render(
      <InstrumentResult
        instrument={LUNG_LDCT_ELIGIBILITY_INSTRUMENT}
        language="es"
        responses={[1, 60, 1, 20, -1, 0]}
      />
    );
    expect(screen.getByText(/tomografía computarizada de dosis baja cada año/i)).toBeVisible();
  });

  it("uses urgent clinical cards for lung symptoms and CRC red flags without scheduling framing", () => {
    const { unmount } = render(
      <InstrumentResult
        instrument={LUNG_LDCT_ELIGIBILITY_INSTRUMENT}
        language="en"
        responses={[1, 60, 1, 20, -1, 1]}
      />
    );
    const lungUrgent = screen.getByText(/Contact your clinic now about the symptoms/i).closest("aside");
    expect(lungUrgent).toHaveClass("border-rose-400");
    expect(lungUrgent).not.toHaveTextContent(/set up a screening/i);
    unmount();

    render(
      <InstrumentResult
        instrument={CRC_ELIGIBILITY_INSTRUMENT}
        language="en"
        responses={[60, 0, 0, 0, 1, 0]}
      />
    );
    const crcUrgent = screen.getByText(/Contact your clinic now about the symptom or family-history answer/i).closest("aside");
    expect(crcUrgent).toHaveClass("border-rose-400");
    expect(crcUrgent).not.toHaveTextContent(/schedule a screening/i);
  });

  it("distinguishes routine CRC due and recent-other-modality not-due actions", () => {
    const { unmount } = render(
      <InstrumentResult instrument={CRC_ELIGIBILITY_INSTRUMENT} language="en" responses={[60, 0, 0, 0, 0, 0]} />
    );
    expect(screen.getByText(/Ask your clinician which colorectal screening option fits you/i)).toBeVisible();
    unmount();

    render(
      <InstrumentResult instrument={CRC_ELIGIBILITY_INSTRUMENT} language="en" responses={[60, 0, 0, 1, 0, 0]} />
    );
    expect(screen.getByText("You may already be up to date — tell your clinician what you've had.")).toBeVisible();
  });

  it("renders condition-specific high/elevated adult actions", () => {
    const { unmount: unmountPrediabetes } = render(
      <InstrumentResult instrument={PREDIABETES_RISK_INSTRUMENT} language="en" responses={[3, 1, 0, 1, 1, 1, 70, 280]} />
    );
    expect(screen.getByText(/National Diabetes Prevention Program/i)).toBeVisible();
    unmountPrediabetes();

    const { unmount: unmountAudit } = render(
      <InstrumentResult instrument={AUDIT_C_INSTRUMENT} language="en" responses={[1, 4, 4, 4]} />
    );
    expect(screen.getByText("Cutting back suddenly after heavy drinking can be dangerous. Talk with a clinician about a safe plan first.")).toBeVisible();
    expect(screen.getByText("Your answers stay on this device. You choose if and when to share them.")).toBeVisible();
    unmountAudit();

    render(<InstrumentResult instrument={DDS2_INSTRUMENT} language="en" responses={[3, 3]} />);
    expect(screen.getByText(/diabetes educator or diabetes care team/i)).toBeVisible();
    expect(screen.queryByText(/psychiatry referral/i)).not.toBeInTheDocument();
  });

  it("renders falls prevention with vision and medication actions or an urgent injury card", () => {
    const { unmount } = render(
      <InstrumentResult instrument={STEADI3_INSTRUMENT} language="en" responses={[0, 1, 0, -1]} />
    );
    expect(screen.getByRole("link", { name: /vision screening/i })).toHaveAttribute("href", "/screening");
    expect(screen.getByText(/medication review/i)).toBeVisible();
    unmount();

    render(<InstrumentResult instrument={STEADI3_INSTRUMENT} language="en" responses={[1, 0, 0, 1]} />);
    expect(screen.getByText(/Contact your clinic now about the fall and injury/i).closest("aside")).toHaveClass("border-rose-400");
  });

  it("never renders an adult action card alongside the shared crisis branch", () => {
    const crisisLung = {
      ...LUNG_LDCT_ELIGIBILITY_INSTRUMENT,
      items: LUNG_LDCT_ELIGIBILITY_INSTRUMENT.items.map((item, index) =>
        index === 0 ? { ...item, crisisOnPositive: true } : item
      )
    };
    render(<InstrumentResult instrument={crisisLung} language="en" responses={[1, 60, 1, 20, -1, 0]} />);

    expect(screen.getByRole("link", { name: /Call 988/i })).toBeVisible();
    expect(screen.queryByText(/yearly low-dose CT scan is recommended/i)).not.toBeInTheDocument();
  });
});
