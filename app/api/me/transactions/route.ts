import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initBigQuery } from '@/lib/bq';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const userId = session?.user?.id as string | undefined;
    if (!userId) return new Response(JSON.stringify({ ok: false, error: 'unauthenticated' }), { status: 401 });
    const enabled = (process.env.BIGQUERY_LOGGING_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) return new Response(JSON.stringify({ ok: true, transactions: [] }), { status: 200 });
    const limit = Math.min( parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50, 200 );
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    const dataset = process.env.BIGQUERY_DATASET || 'projectscanner';
    const table = process.env.BIGQUERY_TABLE || 'portfolio_transactions';
    const c = initBigQuery();
    if (!c) return new Response(JSON.stringify({ ok: true, transactions: [] }), { status: 200 });

    // We need portfolio id(s); currently assume single portfolio per user.
    // Query all rows for user (userId) order by createdAt desc.
    const query = `SELECT userId, portfolioId, action, symbol, assetId, delta, beforeAmt, afterAmt, price, meta, source, createdAt FROM \`${projectId}.${dataset}.${table}\` WHERE userId = @userId ORDER BY createdAt DESC LIMIT ${limit}`;
    const qStart = Date.now();
    const [rows] = await c.query({ query, params: { userId } });
    const qMs = Date.now() - qStart;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[transactions_api] rows', rows.length, 'limit', limit, 'time', qMs + 'ms');
    }
    return new Response(JSON.stringify({ ok: true, transactions: rows }), { status: 200 });
  } catch (e: any) {
    console.warn('transactions_api_error', e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500 });
  }
}
