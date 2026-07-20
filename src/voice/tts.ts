import type { Language } from "@/i18n/strings";

const subscribers = new Set<(speaking: boolean) => void>();
const activeResolutions = new Set<() => void>();
const warmedSyntheses = new WeakSet<SpeechSynthesis>();
let speakingNow = false;

function publish(next: boolean): void {
  if (speakingNow === next) return;
  speakingNow = next;
  subscribers.forEach((subscriber) => subscriber(next));
}

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function warmVoices(target: SpeechSynthesis): void {
  if (target.getVoices().length > 0 || warmedSyntheses.has(target)) return;
  warmedSyntheses.add(target);
  target.addEventListener("voiceschanged", () => target.getVoices(), { once: true });
}

export function speak(
  text: string,
  options: { language: Language; rate?: number }
): Promise<void> {
  const target = synthesis();
  if (!target || typeof SpeechSynthesisUtterance === "undefined") return Promise.resolve();

  warmVoices(target);
  if (activeResolutions.size > 0 || speakingNow) stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1;
  if (options.language === "es") {
    const preferredVoice = target
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("es-us"));
    utterance.lang = preferredVoice?.lang ?? "es-ES";
    if (preferredVoice) utterance.voice = preferredVoice;
  } else {
    utterance.lang = "en-US";
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      activeResolutions.delete(settle);
      if (activeResolutions.size === 0) publish(false);
      resolve();
    };
    utterance.onend = settle;
    utterance.onerror = settle;
    activeResolutions.add(settle);
    publish(true);
    target.speak(utterance);
  });
}

export function stopSpeaking(): void {
  const target = synthesis();
  target?.cancel();
  const resolutions = [...activeResolutions];
  resolutions.forEach((settle) => settle());
  publish(false);
}

export function isSpeaking(): boolean {
  return speakingNow;
}

export function subscribeSpeaking(cb: (speaking: boolean) => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
