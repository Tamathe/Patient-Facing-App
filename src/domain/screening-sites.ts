import { tScreening, type Language, type ScreeningStringKey } from "@/i18n/strings";
import type { SiteWithDistance } from "./ky-geo";
import type { ReferralDestination, ScreeningSite, ScreeningVenueType } from "./types";

// The Kentucky screening-site catalog, merged from rhtp-prototype
// src/data/seed.ts as a typed fixture (copy-and-adapt). Distances are always
// derived from the patient's ZIP via ky-geo withDistances().
export const SCREENING_SITES: ScreeningSite[] = [
  {
    id: "site_fqhc_mobile",
    name: "Perry County FQHC Mobile Camera",
    type: "mobile_clinic",
    zip: "41701",
    city: "Hazard",
    lat: 37.295,
    lng: -83.235,
    nextAvailable: "Tuesday 2:40 PM",
    nextAvailableHours: 26,
    rideSupport: true,
    lowCost: true
  },
  {
    id: "site_fqhc",
    name: "Hazard FQHC Eye Program",
    type: "fqhc",
    zip: "41701",
    city: "Hazard",
    lat: 37.1,
    lng: -83.42,
    nextAvailable: "Monday 10:00 AM",
    nextAvailableHours: 60,
    rideSupport: false,
    lowCost: true
  },
  {
    id: "site_kroger",
    name: "Community Camera at Kroger",
    type: "kroger",
    zip: "41701",
    city: "Hazard",
    lat: 37.25,
    lng: -83.18,
    nextAvailable: "Friday 4:00 PM",
    nextAvailableHours: 26,
    rideSupport: false,
    lowCost: true
  },
  {
    id: "site_eye",
    name: "Regional Eye Clinic",
    type: "eye_clinic",
    zip: "40741",
    city: "London",
    lat: 37.1015,
    lng: -84.0913,
    nextAvailable: "Tomorrow 2:00 PM",
    nextAvailableHours: 20,
    rideSupport: false,
    lowCost: false
  },
  {
    id: "site_pharmacy_hazard",
    name: "Hometown Pharmacy Camera - Hazard",
    type: "pharmacy",
    zip: "41701",
    city: "Hazard",
    lat: 37.26,
    lng: -83.23,
    nextAvailable: "Thursday 1:00 PM",
    nextAvailableHours: 22,
    rideSupport: false,
    lowCost: true
  },
  {
    id: "site_pcp_hazard",
    name: "Perry County Primary Care",
    type: "primary_care",
    zip: "41701",
    city: "Hazard",
    lat: 37.28,
    lng: -83.19,
    nextAvailable: "Wednesday 3:30 PM",
    nextAvailableHours: 40,
    rideSupport: false,
    lowCost: true
  },
  {
    id: "site_fqhc_louisville",
    name: "Family Health Centers - Louisville",
    type: "fqhc",
    zip: "40202",
    city: "Louisville",
    lat: 38.247,
    lng: -85.766,
    nextAvailable: "Tomorrow 11:00 AM",
    nextAvailableHours: 24,
    rideSupport: true,
    lowCost: true
  },
  {
    id: "site_kroger_louisville",
    name: "Kroger Little Clinic Camera - Louisville Highlands",
    type: "kroger",
    zip: "40204",
    city: "Louisville",
    lat: 38.238,
    lng: -85.723,
    nextAvailable: "Friday 5:00 PM",
    nextAvailableHours: 28,
    rideSupport: false,
    lowCost: true
  },
  {
    id: "site_eye_louisville",
    name: "Louisville Regional Eye Institute",
    type: "eye_clinic",
    zip: "40202",
    city: "Louisville",
    lat: 38.2,
    lng: -85.82,
    nextAvailable: "Next Tuesday 9:00 AM",
    nextAvailableHours: 90,
    rideSupport: false,
    lowCost: false
  },
  {
    id: "site_kroger_lexington",
    name: "Kroger Little Clinic Camera - Lexington Hamburg",
    type: "kroger",
    zip: "40509",
    city: "Lexington",
    lat: 38.03,
    lng: -84.42,
    nextAvailable: "Saturday 10:00 AM",
    nextAvailableHours: 34,
    rideSupport: false,
    lowCost: true
  },
  {
    id: "site_eye_lexington",
    name: "Bluegrass Eye Clinic - Lexington",
    type: "eye_clinic",
    zip: "40507",
    city: "Lexington",
    lat: 38.03,
    lng: -84.505,
    nextAvailable: "Monday 8:30 AM",
    nextAvailableHours: 52,
    rideSupport: false,
    lowCost: false
  },
  {
    id: "site_fqhc_bowling_green",
    name: "Community Health Center - Bowling Green",
    type: "fqhc",
    zip: "42101",
    city: "Bowling Green",
    lat: 36.98,
    lng: -86.44,
    nextAvailable: "Wednesday 2:00 PM",
    nextAvailableHours: 44,
    rideSupport: true,
    lowCost: true
  },
  {
    id: "site_pharmacy_frankfort",
    name: "Frankfort Pharmacy Camera",
    type: "pharmacy",
    zip: "40601",
    city: "Frankfort",
    lat: 38.2,
    lng: -84.87,
    nextAvailable: "Thursday 4:30 PM",
    nextAvailableHours: 30,
    rideSupport: false,
    lowCost: true
  }
];

// Referral destinations for the abnormal path. Distances are from the Hazard
// hero context; retina slots run sooner than optometry because urgency is the
// point of the tiering.
export const REFERRAL_DESTINATIONS: ReferralDestination[] = [
  {
    id: "dest_hazard_optometry",
    name: "Hazard Optometry Associates",
    kind: "optometry",
    city: "Hazard",
    distanceMiles: 2,
    phone: "606-555-0114",
    nextSlots: ["Tue Jul 14 · 9:20 AM", "Thu Jul 16 · 1:40 PM", "Mon Jul 20 · 11:00 AM"],
    coverageNote: "Most Kentucky Medicaid MCO plans cover this visit. Bring your card; the office confirms before you owe anything."
  },
  {
    id: "dest_whitesburg_eye",
    name: "Whitesburg Family Eye Care",
    kind: "optometry",
    city: "Whitesburg",
    distanceMiles: 24,
    phone: "606-555-0177",
    nextSlots: ["Wed Jul 15 · 10:10 AM", "Fri Jul 17 · 3:00 PM", "Tue Jul 21 · 8:40 AM"],
    coverageNote: "Sliding-fee schedule available. The office confirms your coverage when they call."
  },
  {
    id: "dest_uk_retina",
    name: "UK Retina — Lexington",
    kind: "retina",
    city: "Lexington",
    distanceMiles: 112,
    phone: "859-555-0142",
    nextSlots: ["Thu Jul 9 · 8:00 AM", "Fri Jul 10 · 2:20 PM", "Mon Jul 13 · 9:40 AM"],
    coverageNote: "Referral-based retina service. Medicaid and most plans accepted; ask about same-day transport help."
  },
  {
    id: "dest_louisville_retina",
    name: "Louisville Regional Eye Institute — Retina Service",
    kind: "retina",
    city: "Louisville",
    distanceMiles: 178,
    phone: "502-555-0163",
    nextSlots: ["Fri Jul 10 · 9:00 AM", "Mon Jul 13 · 1:20 PM", "Wed Jul 15 · 10:40 AM"],
    coverageNote: "Referral-based retina service. The scheduling desk verifies coverage during the confirmation call."
  }
];

export function nearestDestinationOfKind(kind: ReferralDestination["kind"]): ReferralDestination {
  return REFERRAL_DESTINATIONS.filter((destination) => destination.kind === kind).sort(
    (left, right) => left.distanceMiles - right.distanceMiles
  )[0];
}

export function getDestinationById(id: string): ReferralDestination | undefined {
  return REFERRAL_DESTINATIONS.find((destination) => destination.id === id);
}

export function getSiteById(id: string): ScreeningSite | undefined {
  return SCREENING_SITES.find((site) => site.id === id);
}

// Ported ranking (rhtp src/lib/site-matching.ts): "best" folds ride support and
// cost into the distance score so a supported, low-cost camera can beat a
// slightly closer unsupported one.
export type MatchMode = "best" | "fastest" | "closest";

function bestScore(site: SiteWithDistance): number {
  let score = site.distanceMiles;
  if (!site.rideSupport) {
    score += 20;
  }
  if (!site.lowCost) {
    score += 15;
  }
  return score;
}

export function rankSites(sites: SiteWithDistance[], mode: MatchMode): SiteWithDistance[] {
  const copy = [...sites];
  if (mode === "closest") {
    return copy.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
  if (mode === "fastest") {
    return copy.sort((a, b) => a.nextAvailableHours - b.nextAvailableHours);
  }
  return copy.sort((a, b) => bestScore(a) - bestScore(b));
}

const MODE_LEAD_KEY: Record<MatchMode, ScreeningStringKey> = {
  best: "matchLeadBest",
  fastest: "matchLeadFastest",
  closest: "matchLeadClosest"
};

export function explainMatch(site: SiteWithDistance, mode: MatchMode, language: Language): string {
  const parts = [
    tScreening(language, "matchPartDistance", { miles: site.distanceMiles }),
    tScreening(language, "matchPartOpen", { when: site.nextAvailable })
  ];
  if (site.rideSupport) {
    parts.push(tScreening(language, "matchPartRide"));
  }
  if (site.lowCost) {
    parts.push(tScreening(language, "matchPartLowCost"));
  }
  return tScreening(language, MODE_LEAD_KEY[mode], { parts: parts.join(", ") });
}

const VENUE_LABEL_KEY: Record<ScreeningVenueType, ScreeningStringKey> = {
  fqhc: "venueFqhc",
  mobile_clinic: "venueMobile",
  community_camera: "venueCommunityCamera",
  eye_clinic: "venueEyeClinic",
  kroger: "venueKroger",
  pharmacy: "venuePharmacy",
  primary_care: "venuePrimaryCare"
};

export function venueLabel(type: ScreeningVenueType, language: Language): string {
  return tScreening(language, VENUE_LABEL_KEY[type]);
}

// The equity nudge: when the nearest eye specialist is meaningfully farther
// than the nearest camera venue, say so — a camera close to home closes the
// gap without the long drive.
export function equityGap(sites: SiteWithDistance[]): { eyeMiles: number; cameraMiles: number } | null {
  const byDistance = [...sites].sort((a, b) => a.distanceMiles - b.distanceMiles);
  const nearestEye = byDistance.find((site) => site.type === "eye_clinic");
  const nearestCamera = byDistance.find((site) => site.type !== "eye_clinic");
  if (!nearestEye || !nearestCamera || nearestEye.distanceMiles <= nearestCamera.distanceMiles + 3) {
    return null;
  }
  return { eyeMiles: nearestEye.distanceMiles, cameraMiles: nearestCamera.distanceMiles };
}

// Whole months between the last screening and now, for the nudge copy.
export function monthsSince(dateIso: string, now: Date): number {
  const then = new Date(dateIso);
  const months = (now.getUTCFullYear() - then.getUTCFullYear()) * 12 + (now.getUTCMonth() - then.getUTCMonth());
  const adjusted = now.getUTCDate() < then.getUTCDate() ? months - 1 : months;
  return Math.max(0, adjusted);
}
