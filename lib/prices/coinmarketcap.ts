// CoinMarketCap price fetcher
// Requires env CMC_API_KEY (or COINMARKETCAP_API_KEY) with a Pro or free tier key.
// Docs: https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyQuotesLatest

export interface CMCPriceResult { [symbolLower: string]: { usd: number; change24h?: number; change7d?: number } }

function getCMCKey() {
  return process.env.CMC_API_KEY || process.env.COINMARKETCAP_API_KEY;
}

export async function fetchCMCPrices(symbols: string[], convert: string = 'USD'): Promise<CMCPriceResult> {
  const key = getCMCKey();
  if (!key) throw new Error('CMC_API_KEY missing');
  // CoinMarketCap symbols must be comma separated, uppercase
  const unique = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
  if (!unique.length) return {};
  // CMC limit typical: 100 symbols / request (free). Chunk if needed.
  const CHUNK = 90;
  const out: CMCPriceResult = {};
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(slice.join(','))}&convert=${convert}`;
    const res = await fetch(url, { headers: { 'X-CMC_PRO_API_KEY': key, 'Accept': 'application/json' } });
    if (!res.ok) {
      const txt = await res.text().catch(()=>res.statusText);
      throw new Error('CMC fetch failed: ' + res.status + ' ' + txt);
    }
    const json: any = await res.json();
    const data = json.data || {};
    for (const sym of Object.keys(data)) {
      try {
        const quote = data[sym].quote?.[convert];
        if (!quote) continue;
        out[sym.toLowerCase()] = {
          usd: Number(quote.price),
          change24h: Number(quote.percent_change_24h),
            change7d: Number(quote.percent_change_7d)
        };
      } catch {}
    }
  }
  return out;
}
