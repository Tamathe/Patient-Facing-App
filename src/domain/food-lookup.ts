import { normalizeFdcFood, normalizeOffProduct, withSource } from "./food-normalize";
import type { IdentifiedFood } from "./types";

export type FoodLookupResult = { found: true; food: IdentifiedFood } | { found: false };

export type FoodLookupDeps = {
  fetchImpl?: typeof fetch;
  cache: Map<string, IdentifiedFood>;
  seed: Record<string, IdentifiedFood>;
  fdcApiKey: string | null;
};

const OFF_TIMEOUT_MS = 3500;
const FDC_TIMEOUT_MS = 3500;

async function fetchJson(fetchImpl: typeof fetch, url: string, timeoutMs: number): Promise<unknown | null> {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function lookupOff(fetchImpl: typeof fetch, barcode: string): Promise<IdentifiedFood | null> {
  const json = await fetchJson(fetchImpl, `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, OFF_TIMEOUT_MS);
  return json ? normalizeOffProduct(barcode, json) : null;
}

async function lookupFdc(fetchImpl: typeof fetch, barcode: string, apiKey: string): Promise<IdentifiedFood | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${barcode}&dataType=Branded&pageSize=5&api_key=${apiKey}`;
  const json = await fetchJson(fetchImpl, url, FDC_TIMEOUT_MS);
  return json ? normalizeFdcFood(barcode, json) : null;
}

export async function resolveBarcode(barcode: string, deps: FoodLookupDeps): Promise<FoodLookupResult> {
  const cached = deps.cache.get(barcode);
  if (cached) {
    return { found: true, food: cached };
  }

  const seeded = deps.seed[barcode];
  if (seeded) {
    deps.cache.set(barcode, seeded);
    return { found: true, food: seeded };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;

  const off = await lookupOff(fetchImpl, barcode);
  if (off) {
    deps.cache.set(barcode, off);
    return { found: true, food: off };
  }

  if (deps.fdcApiKey) {
    const fdc = await lookupFdc(fetchImpl, barcode, deps.fdcApiKey);
    if (fdc) {
      const normalized = withSource(fdc, "barcode_fdc");
      deps.cache.set(barcode, normalized);
      return { found: true, food: normalized };
    }
  }

  return { found: false };
}
