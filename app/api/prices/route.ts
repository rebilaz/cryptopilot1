import { NextResponse } from 'next/server';
import { resolveAssetId } from '@/lib/resolveAssetId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache (module scope) TTL 5m
type CacheEntry = { at: number; data: any };
const CACHE = new Map<string, CacheEntry>();
const TTL = 300_000; // 5 minutes

async function fetchWithTimeout(url: string, init: RequestInit & { timeout?: number } = {}) {
  const { timeout = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally { clearTimeout(id); }
}

async function fetchCoinGecko(ids: string[], vs: string): Promise<any> {
  const base = process.env.COINGECKO_API_BASE || 'https://api.coingecko.com/api/v3';
  const url = `${base}/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=${encodeURIComponent(vs)}`;
  const headers: Record<string,string> = {};
  if (process.env.COINGECKO_API_KEY) headers['x-cg-pro-api-key'] = process.env.COINGECKO_API_KEY!; else headers['x-cg-demo-api-key'] = 'CG-9be1b4b8-e3b1-4f9b-8d9f-4f3b78d5';
  let attempt = 0;
  while (attempt < 2) {
    attempt++;
    const res = await fetchWithTimeout(url, { headers, timeout: 8000 });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      else throw new Error('upstream_failed');
    } else {
      throw new Error('upstream_failed');
    }
  }
  throw new Error('upstream_failed');
}

// GET /api/prices?ids=bitcoin,ethereum&vs=usd
export async function GET(req: Request) {
  // Convert legacy GET ids into POST-style inputs
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids') || '';
  const vs = (searchParams.get('vs') || 'usd').toLowerCase();
  const inputs = idsParam.split(',').map(id => id.trim()).filter(Boolean).map(id => ({ assetId: id }));
  return handlePrices(inputs, vs);
}

// POST /api/prices { inputs:[{assetId?,symbol?}], vs? }
export async function POST(req: Request) {
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ ok:false, error:'invalid_json' }, { status:400 }); }
  const vs = (body?.vs || 'usd').toLowerCase();
  const inputs = Array.isArray(body?.inputs) ? body.inputs : [];
  if (!Array.isArray(inputs)) return NextResponse.json({ ok:false, error:'invalid_inputs' }, { status:400 });
  return handlePrices(inputs, vs);
}

async function handlePrices(inputs: any[], vs: string) {
  const unknown: any[] = [];
  const ids: string[] = [];
  await Promise.all(inputs.map(async (inp: any) => {
    const resolved = await resolveAssetId({ assetId: inp?.assetId, symbol: inp?.symbol });
    if (resolved) ids.push(resolved); else unknown.push(inp);
  }));
  const cgIds = Array.from(new Set(ids));
  if (!cgIds.length) {
    console.log('[prices] resolved', { in: inputs.length, out: 0, partial: false });
    return NextResponse.json({ ok: true, prices: {}, unknown, at: Date.now(), ttl: TTL }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
  const key = cgIds.slice().sort().join(',') + '|' + vs;
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && now - cached.at < TTL) {
    console.log('[prices] fetch cg', { idsCount: cgIds.length, fromCache: true });
    console.log('[prices] resolved', { in: inputs.length, out: cgIds.length, partial: false });
    return NextResponse.json({ ok: true, prices: cached.data, at: cached.at, ttl: TTL, unknown }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
  try {
    const data = await fetchCoinGecko(cgIds, vs);
    CACHE.set(key, { at: now, data });
    console.log('[prices] fetch cg', { idsCount: cgIds.length, fromCache: false });
    console.log('[prices] resolved', { in: inputs.length, out: cgIds.length, partial: false });
    return NextResponse.json({ ok: true, prices: data, at: now, ttl: TTL, unknown }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (e:any) {
    // Partial fallback via binary split to isolate bad ids or upstream partial failures
    const partial: Record<string, any> = {};
    const bad: string[] = [];
    async function fetchSplit(list: string[]) {
      if (!list.length) return;
      try {
        const d = await fetchCoinGecko(list, vs);
        Object.assign(partial, d);
      } catch {
        if (list.length === 1) { bad.push(list[0]); return; }
        const mid = Math.floor(list.length/2);
        await fetchSplit(list.slice(0, mid));
        await fetchSplit(list.slice(mid));
      }
    }
    await fetchSplit(cgIds);
    const unknownFinal = unknown.concat(bad.map(id => ({ assetId: id }))); // merge unresolved + bad
    console.log('[prices] resolved', { in: inputs.length, out: Object.keys(partial).length, partial: true });
    return NextResponse.json({ ok: true, prices: partial, unknown: unknownFinal, partial: true, at: now, ttl: TTL }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
