// Minimal token metadata list for autocomplete.
// Extend as needed (id = Coingecko id).
export interface TokenMeta { id: string; symbol: string; name: string; }

export const TOKENS: TokenMeta[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'tron', symbol: 'TRX', name: 'Tron' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'polygon-pos', symbol: 'MATIC', name: 'Polygon' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
  { id: 'monero', symbol: 'XMR', name: 'Monero' },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin' },
  { id: 'aptos', symbol: 'APT', name: 'Aptos' },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
  { id: 'optimism', symbol: 'OP', name: 'Optimism' },
  { id: 'wrapped-bitcoin', symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  { id: 'dai', symbol: 'DAI', name: 'Dai' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe' },
];

// Simple fuzzy scoring: higher is better.
function scoreToken(t: TokenMeta, q: string): number {
  const qs = q.toLowerCase();
  const sym = t.symbol.toLowerCase();
  const name = t.name.toLowerCase();
  const id = t.id.toLowerCase();
  if (sym === qs) return 120;
  let score = 0;
  if (sym.startsWith(qs)) score += 80 - (sym.length - qs.length);
  if (id.startsWith(qs)) score += 60;
  if (name.startsWith(qs)) score += 40;
  if (sym.includes(qs)) score += 25;
  if (name.includes(qs)) score += 15;
  if (id.includes(qs)) score += 10;
  return score;
}

export function searchTokens(query: string, limit = 8): TokenMeta[] {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  const scored = TOKENS.map(t => ({ t, s: scoreToken(t, q) }))
    .filter(o => o.s > 0)
    .sort((a,b) => b.s - a.s || a.t.symbol.localeCompare(b.t.symbol))
    .slice(0, limit)
    .map(o => o.t);
  return scored;
}
