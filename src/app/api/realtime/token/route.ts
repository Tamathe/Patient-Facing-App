export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "gpt-realtime-2";
const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

export async function POST(): Promise<Response> {
  const provider = process.env.HEALTH_AI_PROVIDER;
  const apiKey = process.env.HEALTH_AI_API_KEY;
  const model = process.env.HEALTH_AI_REALTIME_MODEL || DEFAULT_MODEL;

  if (provider !== "openai") {
    return Response.json({ mode: "mock", reason: "provider_mock" });
  }
  if (!apiKey) {
    return Response.json({ mode: "mock", reason: "no_api_key" });
  }

  try {
    const upstream = await fetch(CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          audio: { output: { voice: "marin" } }
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!upstream.ok) {
      return Response.json({ mode: "error", message: "token_request_failed" }, { status: 502 });
    }

    const data = (await upstream.json()) as { value?: string; expires_at?: number };
    if (!data.value) {
      return Response.json({ mode: "error", message: "no_client_secret" }, { status: 502 });
    }

    return Response.json({ mode: "live", clientSecret: data.value, model, expiresAt: data.expires_at ?? null });
  } catch {
    return Response.json({ mode: "error", message: "token_request_error" }, { status: 502 });
  }
}
