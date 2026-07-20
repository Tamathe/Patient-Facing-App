# AI Data Disclosure Approval Record

**Date:** 2026-07-20  
**Status:** Product-owner approval confirmed for the current prototype copy

The project owner approved the runtime-mode AI data disclosures after reviewing the implementation handoff. The approved scope is:

- on-device mode states that microphone audio is not sent to OpenAI;
- cloud mode names the question, current image, and relevant care context that may be sent to OpenAI;
- live voice mode names microphone audio, the current camera frame, and relevant food and care-plan context sent while the session is active;
- English and Spanish disclosures remain release-gated for locale parity;
- final live-voice transcripts and answers are disclosed as part of the browser-stored demo record;
- deleting demo data requires explicit confirmation.

This records product-owner approval only. It does not represent independent legal counsel, privacy-officer, clinical, or regulatory approval. Obtain those approvals before exposing the prototype to real patient data or production users.

## Implementation references

- `src/i18n/strings.ts`
- `src/domain/privacy-disclosure.ts`
- `src/components/ai-data-disclosure.tsx`
- `src/components/privacy-panel.tsx`
- `src/components/food-ask-bar.tsx`
- `src/app/api/realtime/token/route.ts`
