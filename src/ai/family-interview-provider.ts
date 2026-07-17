import { z } from "zod";
import { familyInterviewInputSchema, parseFamilyInterviewPayload, type FamilyInterviewResult } from "@/domain/family-interview";
import type { FamilyProfile } from "@/domain/types";
import type { Language } from "@/i18n/strings";

export type FamilyInterviewRequest = {
  text: string;
  profile: FamilyProfile;
  passcode?: string;
  language: Language;
};

const routeEnvelopeSchema = z
  .object({
    mode: z.literal("success"),
    data: z.unknown()
  })
  .strict();

export async function requestFamilyInterview(request: FamilyInterviewRequest): Promise<FamilyInterviewResult | null> {
  if (!familyInterviewInputSchema.safeParse(request.text).success) {
    return null;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/family/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const envelope = routeEnvelopeSchema.safeParse((await response.json()) as unknown);
    return envelope.success ? parseFamilyInterviewPayload(envelope.data.data) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
