import { z } from "zod";
import { parseFamilyRankPayload, type FamilyRankResult } from "@/domain/family-rank";
import type { FamilyProfile } from "@/domain/types";
import type { Language } from "@/i18n/strings";

export type FamilyRecommendRequest = {
  text: string;
  profile: FamilyProfile;
  passcode?: string;
  language: Language;
  candidateIds: string[];
};

const routeEnvelopeSchema = z
  .object({
    mode: z.literal("success"),
    data: z.unknown()
  })
  .strict();

/**
 * Every failure class — unconfigured, locked, timeout, off-shape reply — collapses
 * to null so the caller lands on the deterministic ranker instead of an error.
 */
export async function requestFamilyRecommendations(
  request: FamilyRecommendRequest
): Promise<FamilyRankResult | null> {
  if (request.candidateIds.length === 0) {
    return null;
  }

  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = globalThis.setTimeout(() => controller.abort(), 15_000);
    const response = await fetch("/api/family/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const envelope = routeEnvelopeSchema.safeParse((await response.json()) as unknown);
    return envelope.success ? parseFamilyRankPayload(envelope.data.data) : null;
  } catch {
    return null;
  } finally {
    if (timeout !== undefined) {
      globalThis.clearTimeout(timeout);
    }
  }
}
