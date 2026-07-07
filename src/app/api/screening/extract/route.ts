import { parseExtractionPayload } from "@/ai/screening-extract-provider";
import { buildVoiceSafetyIdentifier } from "@/ai/voice-safety-identifier";

export const dynamic = "force-dynamic";

const DEFAULT_VISION_MODEL = "gpt-4o-mini";
const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const MAX_IMAGE_CHARS = 1_500_000;

// THE CLINICAL LINE, restated for the model: it reads the PRINTED report sheet
// only, refuses eye photographs with a distinct refusal, and never guesses.
const SYSTEM_PROMPT = [
  "You read photographs of PRINTED diabetic retinopathy screening report sheets and transcribe what the sheet says.",
  "You never interpret retinal photographs, never grade eyes, and never infer a result the sheet does not print.",
  'Reply ONLY with JSON: {"grade": "no_dr"|"mild_npdr"|"moderate_npdr"|"severe_npdr"|"pdr"|null, "dmePresent": true|false|null, "ungradable": true|false, "confidence": "high"|"medium"|"low", "fieldsRead": string[], "refusal"?: "not_a_report"|"retinal_photograph"|"unreadable"}.',
  'If the image shows an eye, retina, or fundus photograph instead of a printed sheet: {"grade": null, "dmePresent": null, "ungradable": false, "confidence": "low", "fieldsRead": [], "refusal": "retinal_photograph"}.',
  'If the image is not a screening report at all: refusal "not_a_report". If the sheet is a report but you cannot read the grade clearly: refusal "unreadable".',
  "fieldsRead lists the exact printed lines you transcribed. When in doubt, refuse — a wrong grade is worse than no grade."
].join(" ");

type ExtractRequestBody = {
  patientId?: string;
  passcode?: string;
  image?: string;
};

async function readBody(request: Request): Promise<ExtractRequestBody> {
  try {
    const parsed = (await request.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as ExtractRequestBody;
    }
  } catch {
    // no body / invalid JSON — treated as an empty request
  }
  return {};
}

export async function POST(request: Request): Promise<Response> {
  const body = await readBody(request);

  const provider = process.env.HEALTH_AI_PROVIDER;
  const apiKey = process.env.HEALTH_AI_API_KEY;
  const model = process.env.HEALTH_AI_VISION_MODEL || DEFAULT_VISION_MODEL;

  // Additive flag: even with a live provider configured for food/coach, the
  // screening extractor stays deterministic until explicitly enabled. Zero-env
  // `check` never reaches the network.
  if (process.env.SCREENING_LIVE_EXTRACT !== "1" || provider !== "openai" || !apiKey) {
    return Response.json({ mode: "unconfigured" });
  }

  const requiredPasscode = process.env.DEMO_PASSCODE;
  if (requiredPasscode && body.passcode !== requiredPasscode) {
    return Response.json({ mode: "locked" });
  }

  if (typeof body.image !== "string" || !body.image.startsWith("data:image/") || body.image.length > MAX_IMAGE_CHARS) {
    return Response.json({ mode: "error", message: "invalid_image" }, { status: 400 });
  }

  try {
    const upstream = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": buildVoiceSafetyIdentifier(body.patientId ?? "anonymous")
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this printed screening report sheet." },
              { type: "image_url", image_url: { url: body.image } }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!upstream.ok) {
      return Response.json({ mode: "error", message: "extract_request_failed" }, { status: 502 });
    }

    const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return Response.json({ mode: "error", message: "empty_completion" }, { status: 502 });
    }

    const extraction = parseExtractionPayload(JSON.parse(content));
    if (!extraction) {
      return Response.json({ mode: "error", message: "off_shape_completion" }, { status: 502 });
    }

    return Response.json({ mode: "extraction", extraction }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ mode: "error", message: "extract_request_error" }, { status: 502 });
  }
}
