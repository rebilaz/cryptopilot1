import { NextRequest } from 'next/server';
import { searchTokensBigQuery } from '@/lib/bigquery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = (searchParams.get('q') || '').trim();
    const q = rawQ.toLowerCase();
    const limitParam = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Math.min(Math.max(limitParam || 25, 1), 100);

    if (q.length < 2) {
      if (process.env.NODE_ENV !== 'production') console.debug('tokens/search', { q, limit, count: 0, skipped: true });
      return Response.json([]);
    }

    if (!process.env.BQ_TOKENS_DATASET || !process.env.BQ_TOKENS_TABLE) {
      if (process.env.NODE_ENV !== 'production') console.debug('tokens/search', { q, limit, count: 0, noDataset: true });
      return Response.json([]);
    }

    const results = await searchTokensBigQuery(process.env.BQ_TOKENS_DATASET, process.env.BQ_TOKENS_TABLE, q, limit);
    if (process.env.NODE_ENV !== 'production') console.debug('tokens/search', { q, limit, count: results?.length || 0 });
    return Response.json(results || []);
  } catch (e) {
    return new Response('search_failed', { status: 500 });
  }
}
