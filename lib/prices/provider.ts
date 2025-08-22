// Price provider abstraction (offline-first)
// Permet d'utiliser des prix factices (mock) puis de basculer vers l'API Coingecko plus tard sans changer les composants.
// Usage: const prices = await getPrices(['bitcoin','ethereum'])

import { fetchSimplePrices } from './coingecko';

export interface SimplePriceMap { [id: string]: { usd: number; change24h?: number; change7d?: number } }

export interface PriceProvider {
  getSimplePrices(ids: string[], vs?: string): Promise<SimplePriceMap>;
}

// Générateur pseudo-déterministe stable par heure pour donner l'impression de variation
function pseudoDeterministic(base: string, mod: number, spread = 1) {
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  const hour = new Date().getUTCHours();
  const v = (hash ^ (hour * 2654435761)) >>> 0;
  return (v % (mod * 1000)) / 1000 * spread; // valeur pseudo-aléatoire stable pour l'heure courante
}

// --------- MOCK PROVIDER (offline) ---------
class MockPriceProvider implements PriceProvider {
  getSimplePrices(ids: string[], vs: string = 'usd'): Promise<SimplePriceMap> {
    const out: SimplePriceMap = {};
    ids.forEach(id => {
      const base = 10 + pseudoDeterministic(id, 390, 1); // plage ~10-400
      const change24 = (pseudoDeterministic(id + '24', 160, 0.001) * 160 - 8).toFixed(2); // -8 à +8
      const change7 = (pseudoDeterministic(id + '7d', 160, 0.001) * 160 - 8).toFixed(2);
      out[id] = { usd: parseFloat(base.toFixed(2)), change24h: Number(change24), change7d: Number(change7) };
    });
    return Promise.resolve(out);
  }
}

// --------- REAL PROVIDER (Coingecko) ---------
// Simple in-memory cache (server runtime / per edge invocation instance)
const priceCache = new Map<string, { at: number; data: SimplePriceMap }>();
const TTL_MS = 30_000; // 30s pour limiter appels (ajuster selon quota)

class CoingeckoPriceProvider implements PriceProvider {
  async getSimplePrices(ids: string[], vs: string = 'usd'): Promise<SimplePriceMap> {
    if (!ids.length) return {};
    const key = ids.sort().join(',') + '|' + vs;
    const cached = priceCache.get(key);
    const now = Date.now();
    if (cached && now - cached.at < TTL_MS) return cached.data;

    const raw = await fetchSimplePrices(ids, vs);
    const mapped: SimplePriceMap = {};
    for (const id of Object.keys(raw)) {
      mapped[id] = { usd: raw[id][vs] };
    }
    priceCache.set(key, { at: now, data: mapped });
    return mapped;
  }
}

let _provider: PriceProvider | null = null;

function hasAnyKey() {
  return !!(process.env.COINGECKO_API_KEY || process.env.CG_KEY);
}

function coingeckoCallsDisabled() {
  // If env flag set, we always use mock to preserve quota.
  return process.env.DISABLE_COINGECKO === 'true';
}

export function getPriceProvider(): PriceProvider {
  if (_provider) return _provider;
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_PRICES === 'true' || !hasAnyKey() || coingeckoCallsDisabled();
  _provider = useMock ? new MockPriceProvider() : new CoingeckoPriceProvider();
  return _provider;
}

export async function getPrices(ids: string[], vs: string = 'usd') {
  return getPriceProvider().getSimplePrices(ids, vs);
}
