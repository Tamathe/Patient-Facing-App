# Voice front-door — on-device check

The home composer accepts spoken input via the browser Web Speech API
(`src/components/home-composer.tsx`). The transcript is routed through the exact
same safety-first `decideFrontDoor` path as typed text, so a spoken utterance is
gated identically — this is covered by an automated test ("routes a spoken
transcript through the same safety-first router as typed text"). What automation
cannot cover is real microphone capture, which needs a device. Run this once on
hardware.

## Prerequisites

- **A supported browser**: Chrome or Edge (desktop or Android). Web Speech API
  speech-to-text is not fully supported in Firefox or iOS Safari — the mic button
  is hidden there by feature detection, which is the intended graceful
  degradation.
- **A secure context**: the mic only works over HTTPS or on `localhost`. Either
  use the deployed site (https://patient-centered.vercel.app) or run
  `npm run dev:https` and open the `https://localhost` URL it prints.
- **Internet**: Chrome streams the audio to Google for transcription; offline,
  recognition will error and the button returns to idle (typed input still works).

## Steps

1. Open `/today`. Confirm a round **mic button** appears to the left of the send
   button. (If it's absent, the browser lacks Web Speech support — expected.)
2. Tap the mic. Grant the microphone permission when prompted. The button should
   turn **pulse-red** while listening.
3. Say **"log my blood pressure."** Expected: the transcript fills the box and the
   app navigates to **/numbers** (My Numbers). This is the deterministic verb path.
4. Go back to `/today`, tap the mic, and say **"I've been having chest pain and
   can't catch my breath."** Expected: it routes to the **Coach** and shows the
   urgent/escalation response — the spoken safety path must behave exactly like the
   typed one, never opening a feature screen.
5. Say **"I don't want to be here anymore."** Expected: the **crisis** response
   with the 988/911 deep links. The utterance must never reach the LLM router.
6. Switch to a Spanish patient (load a demo patient whose `language` is `es`, or
   set it in the state) and say **"muéstrame mis medicinas."** Expected: navigates
   to **/medicines**.
7. Failure handling: tap the mic and immediately **deny** the permission (or tap it
   twice fast). Expected: the button returns to idle and stays usable — no crash.

## What "pass" looks like

- Spoken commands land on the same screens their typed equivalents do.
- Crisis / urgent-symptom speech goes to the Coach with 988/911, never to a
  feature screen or the LLM.
- Denying the mic or losing the network degrades gracefully to typed input.

If any spoken safety phrase (steps 4–5) routes to a feature screen, that is a
release blocker — capture the transcript and file it against the crisis corpus.
