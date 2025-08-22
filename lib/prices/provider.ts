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
class CoingeckoPriceProvider implements PriceProvider {
  async getSimplePrices(ids: string[], vs: string = 'usd'): Promise<SimplePriceMap> {
    const raw = await fetchSimplePrices(ids, vs);
    const mapped: SimplePriceMap = {};
    for (const id of Object.keys(raw)) {
      mapped[id] = { usd: raw[id][vs] };
    }
    return mapped;
  }
}

let _provider: PriceProvider | null = null;

export function getPriceProvider(): PriceProvider {
  if (_provider) return _provider;
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_PRICES === 'true' || !process.env.CG_KEY; // fallback mock si pas de clé
  _provider = useMock ? new MockPriceProvider() : new CoingeckoPriceProvider();
  return _provider;
}

export async function getPrices(ids: string[], vs: string = 'usd') {
  return getPriceProvider().getSimplePrices(ids, vs);
}
