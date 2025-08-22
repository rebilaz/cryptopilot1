import { NextRequest } from 'next/server';
import { fetchTokenListFromBigQuery } from '@/lib/bigquery';
import { TOKENS } from '@/lib/prices/tokens';

// Fallback in-memory cache (per instance)
let cache: { ts: number; data: any[] } | null = null;
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const useBigQuery = process.env.BQ_TOKENS_DATASET && process.env.BQ_TOKENS_TABLE;

  try {
    if (!cache || Date.now() - cache.ts > TTL_MS) {
      let data = TOKENS;
      if (useBigQuery) {
        try {
          data = await fetchTokenListFromBigQuery(process.env.BQ_TOKENS_DATASET!, process.env.BQ_TOKENS_TABLE!);
        } catch (e) {
          console.error('BigQuery token fetch failed, falling back to static list', e);
        }
      }
      cache = { ts: Date.now(), data };
    }
    let list = cache.data;
    if (q) {
      list = list.filter((t: any) => t.symbol?.toLowerCase().startsWith(q) || t.name?.toLowerCase().includes(q) || t.id?.startsWith(q));
    }
    return new Response(JSON.stringify({ tokens: list.slice(0, 50), source: useBigQuery ? 'bigquery' : 'static' }), {
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
