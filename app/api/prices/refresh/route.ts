import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache 9 min (per server instance)
const CACHE_TTL = 9 * 60 * 1000;
interface CacheEntry { at: number; data: Record<string, number>; }
const memCache = new Map<string, CacheEntry>();

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchBatch(ids: string[], vs: string, apiKey?: string): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=${encodeURIComponent(vs)}`;
  const headers: Record<string,string> = {};
  if (apiKey) headers['x-cg-pro-api-key'] = apiKey;
  let attempt = 0;
  while (attempt < 2) {
    attempt++;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const json = await res.json();
      const out: Record<string, number> = {};
      for (const k of Object.keys(json)) {
        const v = json[k]?.[vs];
        if (typeof v === 'number') out[k] = v;
      }
      return out;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 2) await sleep(500); else throw new Error('Upstream '+res.status);
    } else {
      throw new Error('Upstream '+res.status);
    }
  }
  return {}; // unreachable
}

// POST body: { ids: string[], vs?: string }
export async function POST(req: Request) {
  const priceSource = (process.env.PRICE_SOURCE || '').toLowerCase();
  if (priceSource !== 'coingecko') {
    return NextResponse.json({ prices: {}, updatedAt: new Date().toISOString(), skipped: true, reason: 'PRICE_SOURCE not coingecko' });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const ids: unknown = body?.ids;
  const vs: string = (body?.vs || 'usd').toLowerCase();
  if (!Array.isArray(ids) || !ids.length || !ids.every(i => typeof i === 'string' && i.trim())) {
    return NextResponse.json({ error: 'ids must be non-empty array of strings' }, { status: 400 });
  }
  const cleanIds = Array.from(new Set(ids.map(i => i.toLowerCase().trim()))).slice(0, 500);
  if (!cleanIds.length) return NextResponse.json({ error: 'No valid ids' }, { status: 400 });

  const key = vs + '|' + cleanIds.slice().sort().join(',');
  const now = Date.now();
  const cached = memCache.get(key);
  if (cached && (now - cached.at) < CACHE_TTL) {
    return NextResponse.json({ prices: cached.data, updatedAt: new Date(cached.at).toISOString(), cached: true });
  }

  const apiKey = process.env.COINGECKO_API_KEY || process.env.CG_KEY;
  const batches: string[][] = [];
  for (let i = 0; i < cleanIds.length; i += 100) batches.push(cleanIds.slice(i, i + 100));
  const prices: Record<string, number> = {};
  try {
    for (const batch of batches) {
      const p = await fetchBatch(batch, vs, apiKey);
      Object.assign(prices, p);
    }
  } catch (e:any) {
    return NextResponse.json({ error: 'CoinGecko unavailable', detail: e.message }, { status: 503 });
  }
  memCache.set(key, { at: now, data: prices });
  return NextResponse.json({ prices, updatedAt: new Date(now).toISOString() });
}
