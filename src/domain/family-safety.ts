import { classifyCrisis, classifySafety } from "./safety";
import { screenSocialEmergency } from "./social-screen";
import { crisisTierForDomain } from "./crisis-red-flags";
import type { FamilySafetyEvent } from "./types";

export type FamilySafetyScreen = {
  matched: boolean;
  tier: "crisis" | "emergency";
  domain: string;
};

/**
 * The one safety read for the family thread. Same three classifiers the flow has
 * always run before a network call — what changed is the response: the caller
 * shows the standard resources and keeps helping instead of redirecting away.
 */
export function screenFamilySafety(text: string): FamilySafetyScreen | null {
  const crisis = classifyCrisis(text);
  if (crisis.matched) {
    const tier = crisisTierForDomain(crisis.domain);
    return {
      matched: true,
      tier: tier === "emergency" ? "emergency" : "crisis",
      domain: crisis.domain ?? "unspecified"
    };
  }
  if (classifySafety(text).level !== "allowed") {
    return { matched: true, tier: "emergency", domain: "safety" };
  }
  if (screenSocialEmergency(text)) {
    return { matched: true, tier: "emergency", domain: "social" };
  }
  return null;
}

export function createFamilySafetyEvent(screen: FamilySafetyScreen, now = new Date()): FamilySafetyEvent {
  return {
    id: crypto.randomUUID(),
    tier: screen.tier,
    domain: screen.domain,
    createdAt: now.toISOString()
  };
}

export function pendingFamilySafetyEvent(events: FamilySafetyEvent[]): FamilySafetyEvent | undefined {
  return events.find(({ acknowledgedAt }) => acknowledgedAt === undefined);
}
