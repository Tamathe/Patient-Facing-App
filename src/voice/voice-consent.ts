"use client";

import { useCallback, useState } from "react";
import { recordAuditEvent } from "@/domain/audit";
import { useHealthState } from "@/state/store";

export const VOICE_CONSENT_KEY = "home-health-voice-consent";

export function isVoiceConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VOICE_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function markVoiceConsentGranted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VOICE_CONSENT_KEY, "true");
  } catch {
    // Voice remains available for this session even if persistence is blocked.
  }
}

export function useVoiceEntry(): {
  consentRequired: boolean;
  grantConsent: () => void;
  onSessionStart: (surface: string) => void;
} {
  const { state, dispatch } = useHealthState();
  const [consentRequired, setConsentRequired] = useState(() => !isVoiceConsentGranted());

  const grantConsent = useCallback((): void => {
    markVoiceConsentGranted();
    setConsentRequired(false);
    dispatch({
      type: "addAuditEvent",
      event: recordAuditEvent(state.patient.id, "voice_consent_granted", "Voice consent granted")
    });
  }, [dispatch, state.patient.id]);

  const onSessionStart = useCallback(
    (surface: string): void => {
      dispatch({
        type: "addAuditEvent",
        event: recordAuditEvent(
          state.patient.id,
          "voice_session_started",
          `Voice session started — ${surface}`
        )
      });
    },
    [dispatch, state.patient.id]
  );

  return { consentRequired, grantConsent, onSessionStart };
}
