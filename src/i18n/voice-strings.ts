import type { Language } from "./strings";

export type VoiceStringKey =
  | "listening"
  | "speaking"
  | "stopVoice"
  | "cancel"
  | "consentTitle"
  | "consentIntro"
  | "consentListening"
  | "consentBrowserService"
  | "consentNoSave"
  | "consentTypeInstead"
  | "consentAccept"
  | "answerByVoice"
  | "chipsSpoken"
  | "goingToCancel"
  | "takingYouTo"
  | "didYouMean"
  | "readAloud"
  | "stopReading";

export const voiceStrings: Record<Language, Record<VoiceStringKey, string>> = {
  en: {
    listening: "Listening…",
    speaking: "Speaking…",
    stopVoice: "Stop voice",
    cancel: "Cancel",
    consentTitle: "Before you use voice",
    consentIntro: "Voice is optional. Here is what happens when you turn it on:",
    consentListening: "The microphone listens only while the listening indicator is visible.",
    consentBrowserService: "Your browser may use its speech service to turn what you say into text.",
    consentNoSave: "Nothing is saved without a visible confirmation on the screen.",
    consentTypeInstead: "You can stop and type instead at any time.",
    consentAccept: "I understand, use voice",
    answerByVoice: "Answer by voice",
    chipsSpoken: "You can say: {options}.",
    goingToCancel: "Going to {label} — tap to cancel",
    takingYouTo: "Taking you to {label}",
    didYouMean: "Did you mean {options}?",
    readAloud: "Read aloud",
    stopReading: "Stop reading"
  },
  es: {
    listening: "Escuchando…",
    speaking: "Hablando…",
    stopVoice: "Detener voz",
    cancel: "Cancelar",
    consentTitle: "Antes de usar la voz",
    consentIntro: "La voz es opcional. Esto sucede cuando la activa:",
    consentListening: "El micrófono escucha solo mientras se muestra el indicador de escucha.",
    consentBrowserService: "Su navegador puede usar su servicio de voz para convertir lo que dice en texto.",
    consentNoSave: "Nada se guarda sin una confirmación visible en la pantalla.",
    consentTypeInstead: "Puede detenerse y escribir en cualquier momento.",
    consentAccept: "Entiendo, usar voz",
    answerByVoice: "Responder por voz",
    chipsSpoken: "Puede decir: {options}.",
    goingToCancel: "Yendo a {label} — toque para cancelar",
    takingYouTo: "Le llevo a {label}",
    didYouMean: "¿Quiso decir {options}?",
    readAloud: "Leer en voz alta",
    stopReading: "Detener lectura"
  }
};

export function tVoice(
  language: Language,
  key: VoiceStringKey,
  vars?: Record<string, string | number>
): string {
  const template = voiceStrings[language]?.[key] ?? voiceStrings.en[key];
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}
