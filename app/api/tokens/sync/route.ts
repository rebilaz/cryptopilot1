import { NextResponse } from 'next/server';
import { getBigQuery } from '@/lib/bigquery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/tokens/sync { full?: boolean, truncate?: boolean }
// Sécurisé via header x-refresh-secret == TOKENS_SYNC_SECRET (si défini)
// Mode full: utilise /coins/list, sinon pages markets (TOKEN_SYNC_PAGES ou 3 par défaut)
export async function POST(req: Request) {
  try {
    if (process.env.TOKENS_SYNC_SECRET && req.headers.get('x-refresh-secret') !== process.env.TOKENS_SYNC_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(()=>({}));
    const full = body.full === true || process.env.TOKEN_SYNC_FULL === 'true';
    const truncate = body.truncate === true;
    const dataset = process.env.BQ_TOKENS_DATASET;
    const table = process.env.BQ_TOKENS_TABLE;
    if (!dataset || !table) return NextResponse.json({ error: 'missing_dataset' }, { status: 400 });
    const bq = getBigQuery();
    const location = process.env.BQ_LOCATION;
    const key = process.env.COINGECKO_API_KEY || process.env.CG_KEY;
    const headers: Record<string,string> = { 'Accept': 'application/json' };
    if (key) headers['x-cg-pro-api-key'] = key;

    const now = new Date();
    let rows: any[] = [];
    if (full) {
      const listRes = await fetch(`https://api.coingecko.com/api/v3/coins/list?include_platform=false`, { headers });
      if (!listRes.ok) return NextResponse.json({ error: 'full_list_failed', status: listRes.status }, { status: 502 });
      const list = await listRes.json();
      rows = list.map((c: any) => ({ id: c.id, symbol: (c.symbol||'').toUpperCase(), name: c.name, rank: null, updated_at: now }));
      // Enrich ranks (limit pages)
      const enrichPages = parseInt(process.env.TOKEN_SYNC_MARKET_PAGES || '6', 10);
      if (enrichPages > 0) {
        const perPage = 250;
        const rankMap = new Map<string, number>();
        for (let p=1; p<=enrichPages; p++) {
          const mr = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=false`, { headers });
          if (!mr.ok) break;
          const mj = await mr.json();
            for (const r of mj) if (!rankMap.has(r.id)) rankMap.set(r.id, r.market_cap_rank || null);
          if (mj.length < perPage) break;
        }
        rows.forEach(r => { if (rankMap.has(r.id)) r.rank = rankMap.get(r.id); });
      }
    } else {
      const pages = parseInt(process.env.TOKEN_SYNC_PAGES || '3', 10);
      const perPage = 250;
      for (let p=1; p<=pages; p++) {
        const resM = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=false`, { headers });
        if (!resM.ok) return NextResponse.json({ error: 'markets_failed', page: p }, { status: 502 });
        const json = await resM.json();
        rows.push(...json.map((c: any) => ({ id: c.id, symbol: (c.symbol||'').toUpperCase(), name: c.name, rank: c.market_cap_rank || null, updated_at: now })));
        if (json.length < perPage) break;
      }
      // Déduplique
      const m = new Map();
      for (const r of rows) {
        if (!m.has(r.id)) m.set(r.id, r); else {
          const ex: any = m.get(r.id);
          if ((r.rank||9e9) < (ex.rank||9e9)) m.set(r.id, r);
        }
      }
      rows = Array.from(m.values());
    }

    if (truncate) {
      await bq.createQueryJob({ query: `TRUNCATE TABLE \`${dataset}.${table}\``, location });
    }
    // Insert par batch
    const tbl = bq.dataset(dataset).table(table);
    const CHUNK = 500;
    for (let i=0;i<rows.length;i+=CHUNK) {
      await tbl.insert(rows.slice(i,i+CHUNK), { ignoreUnknownValues: true });
    }
    return NextResponse.json({ inserted: rows.length, mode: full ? 'full' : 'partial' });
  } catch (e:any) {
    return NextResponse.json({ error: 'sync_failed', message: e?.message }, { status: 500 });
  }
}