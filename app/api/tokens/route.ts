import { NextRequest } from 'next/server';
import { fetchTokenListFromBigQuery, searchTokensBigQuery, ensureTokensBootstrapped } from '@/lib/bigquery';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { TOKENS } from '@/lib/prices/tokens';

// Fallback in-memory cache (per instance)
let cache: { ts: number; data: any[] } | null = null; // full list cache
// query-level cache (short TTL) to avoid hammering BigQuery / filtering repeatedly
const queryCache: Record<string, { ts: number; data: any[] }> = {};
const QUERY_TTL = 60 * 1000; // 60s
let lastBigQueryError: string | null = null;
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

// Scoring & ranking util
function scoreToken(t: any, q: string): number {
  const qs = q.toLowerCase();
  const sym = (t.symbol || '').toLowerCase();
  const name = (t.name || '').toLowerCase();
  const id = (t.id || '').toLowerCase();
  if (sym === qs) return 1000;
  if (sym.startsWith(qs)) return 800;
  if (name.startsWith(qs)) return 700;
  if (id.startsWith(qs)) return 650;
  if (sym.includes(qs)) return 500;
  if (name.includes(qs)) return 400;
  if (id.includes(qs)) return 350;
  // fuzzy: subsequence match gives a small score
  let si = 0; let matched = 0;
  for (const ch of sym) { if (ch === qs[si]) { si++; matched++; if (si === qs.length) break; } }
  if (matched >= Math.min(qs.length, 3)) return 200 + matched * 5;
  return 0;
}

function dedupeAndRank(list: any[], q: string, limit: number): any[] {
  const bySymbol: Record<string, any> = {};
  for (const t of list) {
    const key = (t.symbol || '').toUpperCase();
    if (!key) continue;
    const existing = bySymbol[key];
    if (!existing) {
      bySymbol[key] = t;
    } else {
      // prefer one with rank (lower) or shorter name as tie-breaker
      const er = existing.rank ?? Number.MAX_SAFE_INTEGER;
      const tr = t.rank ?? Number.MAX_SAFE_INTEGER;
      if (tr < er || (tr === er && (t.name?.length || 999) < (existing.name?.length || 999))) bySymbol[key] = t;
    }
  }
  const unique = Object.values(bySymbol);
  const scored = unique.map(t => ({ t, s: scoreToken(t, q) }));
  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    const ar = a.t.rank ?? Number.MAX_SAFE_INTEGER;
    const br = b.t.rank ?? Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    return (a.t.name || '').localeCompare(b.t.name || '');
  });
  return scored.filter(x => x.s > 0).slice(0, limit).map(x => x.t);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get('q') || '').trim();
  const q = qRaw.toLowerCase();
  const force = searchParams.get('refresh') === '1';
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100);
  const useBigQuery = process.env.BQ_TOKENS_DATASET && process.env.BQ_TOKENS_TABLE;

  try {
  if (force || !cache || Date.now() - cache.ts > TTL_MS) {
      let data = TOKENS;
      if (useBigQuery) {
        try {
          // Auto bootstrap (dev) if enabled
          await ensureTokensBootstrapped();
          data = await fetchTokenListFromBigQuery(process.env.BQ_TOKENS_DATASET!, process.env.BQ_TOKENS_TABLE!);
          lastBigQueryError = null;
        } catch (e) {
          console.error('BigQuery token fetch failed, falling back to static list', e);
          lastBigQueryError = (e as any)?.message || String(e);
          // ne pas figer un cache statique long si BigQuery échoue: retour direct
          return new Response(JSON.stringify({ tokens: data.slice(0,50), source: 'static_fallback', bqError: lastBigQueryError }), { status: 200, headers: { 'Content-Type':'application/json','Cache-Control':'no-cache' } });
        }
      }
      cache = { ts: Date.now(), data };
    }
    let list = cache.data;
    if (q) {
      // query cache check
      const qc = queryCache[q];
      if (qc && Date.now() - qc.ts < QUERY_TTL && !force) {
        const debug = searchParams.get('debug') === '1';
        return new Response(JSON.stringify({ tokens: qc.data.slice(0, limit), source: 'query_cache', ...(debug ? { bqError: lastBigQueryError, cachedAt: qc.ts } : {}) }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } });
      }
      if (useBigQuery) {
        try {
          const searched = await searchTokensBigQuery(process.env.BQ_TOKENS_DATASET!, process.env.BQ_TOKENS_TABLE!, q, 300);
          const ranked = dedupeAndRank(searched, q, limit);
          queryCache[q] = { ts: Date.now(), data: ranked };
          return new Response(JSON.stringify({ tokens: ranked, source: 'bigquery_search' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } });
        } catch (e) {
          console.error('BigQuery search failed, fallback to in-memory filter', e);
          lastBigQueryError = (e as any)?.message || String(e);
          if (!cache.data || !cache.data.length) {
            try {
              const fetched = await fetchTokenListFromBigQuery(process.env.BQ_TOKENS_DATASET!, process.env.BQ_TOKENS_TABLE!, 4000);
              cache = { ts: Date.now(), data: fetched };
              lastBigQueryError = null;
            } catch {/* ignore */}
          }
        }
      }
      // Local filtering & ranking
      const prelim = list.filter((t: any) => t.symbol?.toLowerCase().startsWith(q) || t.name?.toLowerCase().startsWith(q) || t.id?.toLowerCase().startsWith(q));
      let ranked = dedupeAndRank(prelim.length ? prelim : list, q, limit);
      // Fuzzy fallback if too few
      if (ranked.length < Math.min(5, limit)) {
        const fuzzyMatches = list.filter((t: any) => (t.symbol || '').toLowerCase().includes(q) || (t.name || '').toLowerCase().includes(q));
        ranked = dedupeAndRank([...ranked, ...fuzzyMatches], q, limit);
      }
      queryCache[q] = { ts: Date.now(), data: ranked };
      const debug = searchParams.get('debug') === '1';
      return new Response(JSON.stringify({ tokens: ranked, source: useBigQuery ? 'bigquery_cache_local_rank' : 'static_local_rank', ...(debug ? { bqError: lastBigQueryError, cachedAt: cache?.ts } : {}) }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } });
    }
    const debug = searchParams.get('debug') === '1';
    return new Response(JSON.stringify({ tokens: list.slice(0, limit), source: useBigQuery ? 'bigquery_cache' : 'static', ...(debug ? { bqError: lastBigQueryError, size: list.length, cachedAt: cache.ts } : {}) }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'token_list_error', message: e?.message || 'Unknown error' }), { status: 500 });
  }
}
