// Minimal token metadata list for autocomplete.
// Extend as needed (id = Coingecko id).
export interface TokenMeta { id: string; symbol: string; name: string; synonyms?: string[]; }

export const TOKENS: TokenMeta[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', synonyms: ['BTC','XBT','BTC-USD'] },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', synonyms: ['ETH','ETH-USD'] },
  { id: 'tether', symbol: 'USDT', name: 'Tether', synonyms: ['USDT','USDT-USD','TETHER'] },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', synonyms: ['USDC','USD-C','USDCOIN'] },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', synonyms: ['BNB','BINANCE-COIN'] },
  { id: 'solana', symbol: 'SOL', name: 'Solana', synonyms: ['SOL'] },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', synonyms: ['XRP'] },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', synonyms: ['ADA'] },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', synonyms: ['DOGE'] },
  { id: 'tron', symbol: 'TRX', name: 'Tron', synonyms: ['TRX'] },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', synonyms: ['DOT'] },
  { id: 'polygon-pos', symbol: 'MATIC', name: 'Polygon', synonyms: ['MATIC','POLYGON'] },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', synonyms: ['LTC'] },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', synonyms: ['LINK','CHAINLINK'] },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', synonyms: ['AVAX'] },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', synonyms: ['UNI'] },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar', synonyms: ['XLM'] },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', synonyms: ['ATOM'] },
  { id: 'monero', symbol: 'XMR', name: 'Monero', synonyms: ['XMR'] },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', synonyms: ['FIL'] },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', synonyms: ['APT'] },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', synonyms: ['ARB'] },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', synonyms: ['OP'] },
  { id: 'wrapped-bitcoin', symbol: 'WBTC', name: 'Wrapped Bitcoin', synonyms: ['WBTC','W-BTC'] },
  { id: 'wrapped-ether', symbol: 'WETH', name: 'Wrapped Ether', synonyms: ['WETH','W-ETH'] },
  { id: 'staked-ether', symbol: 'STETH', name: 'Lido Staked Ether', synonyms: ['STETH','ST-ETH'] },
  { id: 'dai', symbol: 'DAI', name: 'Dai', synonyms: ['DAI'] },
  { id: 'aioz-network', symbol: 'AIOZ', name: 'AIOZ Network', synonyms: ['AIOZ','AIOZ-NETWORK'] },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', synonyms: ['PEPE'] },
  { id: 'lido-dao', symbol: 'LDO', name: 'Lido DAO', synonyms: ['LDO'] },
  { id: 'injective-protocol', symbol: 'INJ', name: 'Injective', synonyms: ['INJ'] },
  { id: 'sui', symbol: 'SUI', name: 'Sui', synonyms: ['SUI'] },
  { id: 'sei-network', symbol: 'SEI', name: 'Sei', synonyms: ['SEI'] },
  { id: 'pyth-network', symbol: 'PYTH', name: 'Pyth Network', synonyms: ['PYTH'] },
  { id: 'jupiter-exchange-solana', symbol: 'JUP', name: 'Jupiter', synonyms: ['JUP','JUPITER'] },
  { id: 'bonk', symbol: 'BONK', name: 'Bonk', synonyms: ['BONK'] },
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
