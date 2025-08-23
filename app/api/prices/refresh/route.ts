import { NextResponse } from 'next/server';
import { fetchSimplePrices } from '@/lib/prices/coingecko';
import { insertPricesIntoBigQuery } from '@/lib/prices/bqPrice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/prices/refresh { ids: string[] }
// Dev/cron helper to pre-warm BigQuery cache.
export async function POST(req: Request) {
  try {
    if (process.env.PRICES_REFRESH_SECRET && req.headers.get('x-refresh-secret') !== process.env.PRICES_REFRESH_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(()=>({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: 'no_ids' }, { status: 400 });
    const raw = await fetchSimplePrices(ids, 'usd');
    const mapped: Record<string,{usd:number}> = {};
    for (const k of Object.keys(raw)) mapped[k] = { usd: raw[k].usd };
    await insertPricesIntoBigQuery(mapped, 'manual');
    return NextResponse.json({ inserted: Object.keys(mapped).length });
  } catch (e:any) {
    return NextResponse.json({ error: 'refresh_failed', message: e?.message }, { status: 500 });
  }
}
