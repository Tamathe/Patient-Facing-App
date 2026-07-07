import type { ScreeningSite } from "./types";

// Ported from rhtp-prototype src/lib/ky-geo.ts (copy-and-adapt). A small demo
// table of Kentucky ZIP centroids (approximate) — a stand-in for a real
// geocoder that makes "based on your ZIP code" a real computation.
export interface GeoPoint {
  lat: number;
  lng: number;
}

export const KY_ZIP_CENTROIDS: Record<string, GeoPoint> = {
  "41701": { lat: 37.2726, lng: -83.2137 }, // Hazard (Perry)
  "41858": { lat: 37.1187, lng: -82.8266 }, // Whitesburg (Letcher)
  "41501": { lat: 37.4757, lng: -82.5188 }, // Pikeville (Pike)
  "40741": { lat: 37.1015, lng: -84.0913 }, // London (Laurel)
  "40507": { lat: 38.0447, lng: -84.4977 }, // Lexington (Fayette)
  "40202": { lat: 38.2564, lng: -85.7519 }, // Louisville (Jefferson)
  "40601": { lat: 38.2045, lng: -84.8733 }, // Frankfort (Franklin)
  "40391": { lat: 37.9903, lng: -84.1791 }, // Winchester (Clark)
  "42101": { lat: 36.9911, lng: -86.4514 }, // Bowling Green (Warren)
  "42301": { lat: 37.7719, lng: -87.1111 }, // Owensboro (Daviess)
  "42003": { lat: 37.0684, lng: -88.6339 }, // Paducah (McCracken)
  "40403": { lat: 37.5709, lng: -84.2963 } // Berea (Madison)
};

const DEFAULT_ZIP = "41701";

const normalizeZip = (zip: string): string => (zip ?? "").trim().slice(0, 5);

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

// Great-circle distance in miles between two points.
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Resolve a ZIP to a centroid: exact match, then longest shared prefix, then a
// sensible default so an unknown ZIP never breaks the flow.
export function centroidForZip(zip: string): GeoPoint {
  const clean = normalizeZip(zip);
  if (KY_ZIP_CENTROIDS[clean]) {
    return KY_ZIP_CENTROIDS[clean];
  }

  const known = Object.keys(KY_ZIP_CENTROIDS);
  for (const prefixLength of [4, 3, 2]) {
    if (clean.length < prefixLength) {
      continue;
    }
    const match = known.find((candidate) => candidate.slice(0, prefixLength) === clean.slice(0, prefixLength));
    if (match) {
      return KY_ZIP_CENTROIDS[match];
    }
  }
  return KY_ZIP_CENTROIDS[DEFAULT_ZIP];
}

export function isKnownZip(zip: string): boolean {
  return Boolean(KY_ZIP_CENTROIDS[normalizeZip(zip)]);
}

// The base-app ScreeningSite carries coordinates only; distance is derived per
// entered ZIP, never stored.
export type SiteWithDistance = ScreeningSite & { distanceMiles: number };

export function withDistances(sites: ScreeningSite[], originZip: string): SiteWithDistance[] {
  const origin = centroidForZip(originZip);
  return sites.map((site) => ({
    ...site,
    distanceMiles: Math.max(1, Math.round(haversineMiles(origin, { lat: site.lat, lng: site.lng })))
  }));
}
