import { buildVoiceSafetyIdentifier } from "@/ai/voice-safety-identifier";

export const dynamic = "force-dynamic";

const DEFAULT_COACH_MODEL = "gpt-4o-mini";
const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const MAX_QUESTION_CHARS = 2000;
const MAX_SYSTEM_CHARS = 8000;
const DEFAULT_MAX_TOKENS = 320;

type CoachRequestBody = {
  patientId?: string;
  passcode?: string;
  question?: string;
  system?: string;
};

async function readBody(request: Request): Promise<CoachRequestBody> {
  try {
    const parsed = (await request.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as CoachRequestBody;
    }
  } catch {
    // no body / invalid JSON — treated as an empty request
  }
  return {};
}

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function POST(request: Request): Promise<Response> {
  const body = await readBody(request);

  const question = clamp(body.question, MAX_QUESTION_CHARS).trim();
  if (question.length === 0) {
    return Response.json({ mode: "error", message: "empty_question" }, { status: 400 });
  }

  const provider = process.env.HEALTH_AI_PROVIDER;
  const apiKey = process.env.HEALTH_AI_API_KEY;
  const model = process.env.HEALTH_AI_COACH_MODEL || DEFAULT_COACH_MODEL;

  // No live provider configured: the client falls back to the on-device coach.
  if (provider !== "openai" || !apiKey) {
    return Response.json({ mode: "unconfigured" });
  }

  // Demo cost gate mirrors /api/food/vision and /api/realtime/token: on a public
  // deploy, only spend credits when the request carries the shared passcode.
  // Skipped when DEMO_PASSCODE is unset (local dev).
  const requiredPasscode = process.env.DEMO_PASSCODE;
  if (requiredPasscode && body.passcode !== requiredPasscode) {
    return Response.json({ mode: "locked" });
  }

  const system = clamp(body.system, MAX_SYSTEM_CHARS);

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
        temperature: 0.3,
        max_tokens: DEFAULT_MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!upstream.ok) {
      return Response.json({ mode: "error", message: "coach_request_failed" }, { status: 502 });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return Response.json({ mode: "error", message: "empty_completion" }, { status: 502 });
    }

    return Response.json({ mode: "answer", content }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ mode: "error", message: "coach_request_error" }, { status: 502 });
  }
}
