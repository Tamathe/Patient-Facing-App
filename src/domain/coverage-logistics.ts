// Ported from rhtp-prototype src/lib/coverage-logistics.ts (copy-and-adapt).
// The navigator-confirmation machinery stayed behind; what this app keeps is
// the honest per-site coverage hint and the ride hook into sdoh-resources.
export type ScreeningCoverageOption = {
  id: string;
  siteId: string;
  payerLabel: string;
  estimatedCost: string;
  rideOption?: string;
  rideResourceId?: string;
};

export const SCREENING_COVERAGE_OPTIONS: ScreeningCoverageOption[] = [
  {
    id: "coverage_mobile_fqhc",
    siteId: "site_fqhc_mobile",
    payerLabel: "Kentucky Medicaid MCO",
    estimatedCost: "$0–25 (demo estimate)",
    rideOption: "LKLP Community Action Council transportation",
    rideResourceId: "lklp_transportation_region_13"
  },
  {
    id: "coverage_hazard_fqhc",
    siteId: "site_fqhc",
    payerLabel: "FQHC sliding-fee schedule",
    estimatedCost: "Sliding fee — the clinic confirms (demo estimate)"
  },
  {
    id: "coverage_kroger_hazard",
    siteId: "site_kroger",
    payerLabel: "Self-pay camera program",
    estimatedCost: "About $20 (demo estimate)"
  },
  {
    id: "coverage_pharmacy_hazard",
    siteId: "site_pharmacy_hazard",
    payerLabel: "Self-pay camera program",
    estimatedCost: "About $20 (demo estimate)"
  },
  {
    id: "coverage_pcp_hazard",
    siteId: "site_pcp_hazard",
    payerLabel: "Billed with your primary care visit",
    estimatedCost: "Usual visit cost (demo estimate)"
  },
  {
    id: "coverage_eye_london",
    siteId: "site_eye",
    payerLabel: "Commercial and Medicaid plans",
    estimatedCost: "Specialist copay may apply (demo estimate)"
  },
  {
    id: "coverage_fqhc_louisville",
    siteId: "site_fqhc_louisville",
    payerLabel: "Kentucky Medicaid MCO",
    estimatedCost: "$0–25 (demo estimate)",
    rideOption: "TARC3 paratransit and community ride programs",
    rideResourceId: "kentucky_211_statewide"
  }
];

// Ride-capable options first; a stable tiebreak keeps the choice deterministic.
export function bestCoverageOptionForSite(
  options: ScreeningCoverageOption[],
  siteId: string
): ScreeningCoverageOption | undefined {
  return options
    .filter((option) => option.siteId === siteId)
    .slice()
    .sort((left, right) => {
      const rideScore = Number(right.rideResourceId !== undefined) - Number(left.rideResourceId !== undefined);
      if (rideScore !== 0) {
        return rideScore;
      }
      return left.id.localeCompare(right.id);
    })[0];
}
