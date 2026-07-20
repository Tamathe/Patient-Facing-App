"use client";

import { useCallback, useState, type Dispatch } from "react";
import { recordAuditEvent } from "@/domain/audit";
import { useOptionalHealthState, type HealthAction } from "@/state/store";

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

export type VoiceEntryContext = {
  patientId: string;
  dispatch: Dispatch<HealthAction>;
};

export function useVoiceEntry(explicit?: VoiceEntryContext): {
  consentRequired: boolean;
  grantConsent: () => void;
  onSessionStart: (surface: string) => void;
} {
  const healthState = useOptionalHealthState();
  const patientId = explicit?.patientId ?? healthState?.state.patient.id;
  const dispatch = explicit?.dispatch ?? healthState?.dispatch;
  const [consentRequired, setConsentRequired] = useState(() => !isVoiceConsentGranted());

  const grantConsent = useCallback((): void => {
    markVoiceConsentGranted();
    setConsentRequired(false);
    if (!dispatch || !patientId) return;
    dispatch({
      type: "addAuditEvent",
      event: recordAuditEvent(patientId, "voice_consent_granted", "Voice consent granted")
    });
  }, [dispatch, patientId]);

  const onSessionStart = useCallback(
    (surface: string): void => {
      if (!dispatch || !patientId) return;
      dispatch({
        type: "addAuditEvent",
        event: recordAuditEvent(
          patientId,
          "voice_session_started",
          `Voice session started — ${surface}`
        )
      });
    },
    [dispatch, patientId]
  );

  return { consentRequired, grantConsent, onSessionStart };
}
