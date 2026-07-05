# Food Lens — demo runbook

Camera + voice dietary feedback. Point the phone at a food, ask by voice, get
personalized spoken guidance grounded in the patient's care plan, medications,
and readings. This is a proof-of-concept demo — PHI/privacy and the voice-path
safety gate are deliberately deferred.

Demo device: **Android Galaxy S25, Chrome.** iOS is out of scope.

---

## One-time setup

1. Create `.env.local` in the project root:

   ```
   HEALTH_AI_PROVIDER=openai
   HEALTH_AI_API_KEY=sk-...            # OpenAI key with Realtime access
   HEALTH_AI_REALTIME_MODEL=gpt-realtime-2
   USDA_FDC_API_KEY=DEMO_KEY           # optional; only for non-seeded barcodes
   ```

   Leave `HEALTH_AI_PROVIDER=mock` (or omit the key) to run the typed
   walkie-talkie fallback with no OpenAI account.

2. Buy the three staged products and confirm each barcode matches
   `src/domain/food-seed.ts` (scan them at world.openfoodfacts.org if unsure).
   The seed guarantees the demo works with zero network for these three.

## Run it on the phone

`getUserMedia` needs a secure context (HTTPS), so the phone loads the app
through a tunnel:

```
npm run dev
cloudflared tunnel --url http://localhost:3000
```

Open the printed `https://<name>.trycloudflare.com` URL on the S25 in Chrome.
`allowedDevOrigins` in `next.config.mjs` already whitelists the tunnel hosts.
Grant camera + microphone the first time you press **Start**. If venue Wi-Fi
blocks WebRTC, use the phone's own hotspot.

## Seed the patient

Privacy → **Reset demo**. This seeds Jordan Taylor, Lisinopril 10 mg, three
rising morning readings (132/84 → 141/88 → 149/94, all below the 160/100 call
threshold), and an empty meal log.

## Staged products

| Product | Barcode | Beat |
|---|---|---|
| Campbell's Condensed Chicken Noodle Soup | `051000012616` | Sodium 890 mg → 59% of the daily target + rising readings |
| Morton Lite Salt | `024600017008` | Salt substitute → ACE-inhibitor (lisinopril) caution |
| Quaker Old Fashioned Oats | `030000010204` | Low sodium, high fiber → positive beat |

## Script

1. **Sodium + personalization** — point at the soup; the barcode chip, facts
   card, and a red sodium flag appear. Ask "Can I have this for lunch?" The
   spoken answer cites 890 mg, the 1,500 mg target, and the rising readings.
   Follow up "What's a better pick?" → a generic same-category swap. Tap
   **Log this** → it appears under Recent meals.
2. **Med-diet moment** — point at Lite Salt; ask "Is this healthier than
   regular salt?" The answer flags potassium and lisinopril and says to check
   with the care team.
3. **Spanish moment** — point at the oats; ask "¿Puedo comer esto en el
   desayuno?" The reply comes back in Spanish (the model mirrors the speaker —
   no settings change).
4. **Barge-in** — ask a broad question ("Tell me everything about this label"),
   then interrupt mid-answer with "Shorter, please." The model stops instantly
   and gives the short version.
5. **Close the loop** — show Recent meals on Food, the transcript on Coach, and
   the audit trail on Privacy.

## Contingencies

- WebRTC blocked → phone hotspot.
- Total network loss / no key → the page shows a typed **fallback** with the
  same flags and logging (seeded lookups are local).
- Session error mid-demo → **Try again** re-mints the token and reconnects;
  transcripts are already saved.

---

## What cannot be automated — verify on the real S25

Camera start latency and orientation; native barcode speed and low-light
behavior on real packaging; WebRTC over Wi-Fi and 5G; server-VAD turn-taking
feel and barge-in latency; echo cancellation on speakerphone (the model must not
hear itself); autoplay unlock via the Start tap; Spanish speech quality;
backgrounding the tab releasing camera + mic (OS indicators off); ~10-minute
thermal/battery behavior; tunnel HTTPS acceptance; answer quality on real
packaging under kitchen lighting.
