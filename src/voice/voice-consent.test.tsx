import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VOICE_CONSENT_KEY,
  isVoiceConsentGranted,
  markVoiceConsentGranted,
  useVoiceEntry
} from "./voice-consent";
import { VoiceConsentSheet } from "./voice-consent-sheet";

const dispatch = vi.fn();

vi.mock("@/state/store", () => ({
  useHealthState: () => ({ state: { patient: { id: "patient-voice" } }, dispatch })
}));

function ConsentHarness() {
  const entry = useVoiceEntry();
  return entry.consentRequired ? (
    <VoiceConsentSheet language="en" onAccept={entry.grantConsent} onCancel={() => undefined} />
  ) : (
    <button type="button" onClick={() => entry.onSessionStart("family")}>Start microphone</button>
  );
}

describe("voice consent", () => {
  beforeEach(() => {
    localStorage.clear();
    dispatch.mockClear();
  });

  it("round-trips the dedicated localStorage flag", () => {
    expect(isVoiceConsentGranted()).toBe(false);
    markVoiceConsentGranted();
    expect(localStorage.getItem(VOICE_CONSENT_KEY)).toBe("true");
    expect(isVoiceConsentGranted()).toBe(true);
  });

  it("renders the consent sheet before first mic use and audits consent and session start", () => {
    render(<ConsentHarness />);
    expect(screen.getByRole("dialog", { name: "Before you use voice" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start microphone" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "I understand, use voice" }));

    expect(screen.getByRole("button", { name: "Start microphone" })).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({
      type: "addAuditEvent",
      event: expect.objectContaining({
        patientId: "patient-voice",
        action: "voice_consent_granted",
        label: "Voice consent granted"
      })
    });

    fireEvent.click(screen.getByRole("button", { name: "Start microphone" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "addAuditEvent",
      event: expect.objectContaining({
        action: "voice_session_started",
        label: "Voice session started — family"
      })
    });
  });

  it("starts with consent satisfied when the flag already exists", () => {
    markVoiceConsentGranted();
    const { result } = renderHook(() => useVoiceEntry());
    expect(result.current.consentRequired).toBe(false);

    act(() => result.current.onSessionStart("chat"));
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
