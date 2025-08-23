import { NextResponse } from 'next/server';
import { getBigQuery, ensureTokensTableExists, getTokensBootstrapDebug } from '@/lib/bigquery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataset = process.env.BQ_TOKENS_DATASET;
    const table = process.env.BQ_TOKENS_TABLE;
    if (!dataset || !table) return NextResponse.json({ error: 'missing_dataset' }, { status: 400 });
  const bq = getBigQuery();
  const ensured = await ensureTokensTableExists();
    const location = process.env.BQ_LOCATION;
    const [job] = await bq.createQueryJob({ query: `SELECT COUNT(1) c FROM \`${dataset}.${table}\``, location });
    const [rows] = await job.getQueryResults();
    const count = Number(rows[0]?.c || 0);
  return NextResponse.json({ dataset, table, count, ensured, autoSync: process.env.AUTO_SYNC_TOKENS_ON_START === 'true', verbose: process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true', debug: getTokensBootstrapDebug() });
  } catch (e:any) {
    return NextResponse.json({ error: 'status_failed', message: e?.message }, { status: 500 });
  }
}
