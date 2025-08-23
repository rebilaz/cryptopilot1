import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/resolve-token?symbol=pepe
// Uses Coingecko public search to map a symbol to an id.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || '').trim();
  if (!symbol) return NextResponse.json({ error: 'missing_symbol' }, { status: 400 });
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'search_failed', status: res.status }, { status: 502 });
    const json: any = await res.json();
    const coins: any[] = json?.coins || [];
    const symLower = symbol.toLowerCase();
    // Prefer exact symbol matches then startswith then others, keep best market_cap_rank
    let best: any = null;
    for (const c of coins) {
      const cs = (c.symbol || '').toLowerCase();
      if (cs === symLower || cs.startsWith(symLower)) {
        if (!best) best = c; else {
          const br = best.market_cap_rank || 9e9;
          const cr = c.market_cap_rank || 9e9;
            if (cr < br) best = c;
        }
      }
    }
    if (!best && coins.length) best = coins[0];
    if (!best) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, id: best.id, symbol: best.symbol, name: best.name, market_cap_rank: best.market_cap_rank });
  } catch (e: any) {
    return NextResponse.json({ error: 'resolve_error', message: e?.message }, { status: 500 });
  }
}
