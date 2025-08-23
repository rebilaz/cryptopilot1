// BigQuery price cache helper
// Table schema suggestion:
// CREATE TABLE `${BQ_PRICES_DATASET}.${BQ_PRICES_TABLE}` (
//   id STRING NOT NULL,
//   ts TIMESTAMP NOT NULL,
//   usd FLOAT64,
//   source STRING
// ) PARTITION BY DATE(ts);
// Optionally cluster by id.

import { getBigQuery } from '@/lib/bigquery';

export interface BqPriceRow { id: string; ts: string; usd: number | null; source?: string | null }

// Fetch most recent price per id, ensuring it is not older than maxAgeSeconds
export async function fetchRecentPricesFromBigQuery(ids: string[], maxAgeSeconds = 180): Promise<Record<string,{usd:number}>> {
  if (!ids.length) return {};
  const dataset = process.env.BQ_PRICES_DATASET;
  const table = process.env.BQ_PRICES_TABLE;
  if (!dataset || !table) return {};
  const bq = getBigQuery();
  // Use UNNEST with parameter injection (avoid SQL injection by validating ids)
  const safeIds = ids.map(i => i.replace(/[^a-z0-9-]/gi,'')).filter(Boolean);
  if (!safeIds.length) return {};
  const idList = safeIds.map(i => `"${i}"`).join(',');
  const query = `WITH latest AS (
    SELECT id, ANY_VALUE(usd) AS usd, MAX(ts) AS ts
    FROM \
      \
      \
      \
      \
      \`${dataset}.${table}\`
    WHERE id IN (${idList})
    GROUP BY id
  )
  SELECT id, usd, ts
  FROM latest
  WHERE TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), ts, SECOND) <= ${maxAgeSeconds}`;
  const [job] = await bq.createQueryJob({ query, location: process.env.BQ_LOCATION });
  const [rows] = await job.getQueryResults() as any as [BqPriceRow[]];
  const map: Record<string,{usd:number}> = {};
  for (const r of rows) {
    if (r.usd != null) map[r.id] = { usd: Number(r.usd) };
  }
  return map;
}

// Insert batch of prices (called from ingestion script or cron route)
export async function insertPricesIntoBigQuery(prices: Record<string,{usd:number}>, source='coingecko') {
  const dataset = process.env.BQ_PRICES_DATASET;
  const table = process.env.BQ_PRICES_TABLE;
  if (!dataset || !table) return;
  const bq = getBigQuery();
  const rows = Object.entries(prices).map(([id,p]) => ({ id, usd: p.usd, ts: new Date(), source }));
  if (!rows.length) return;
  await bq.dataset(dataset).table(table).insert(rows, { raw: false, ignoreUnknownValues: true });
}
