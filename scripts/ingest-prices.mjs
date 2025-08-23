#!/usr/bin/env node
/**
 * Ingestion script: fetch live prices (Coingecko) then push into BigQuery price cache.
 * Usage (PowerShell / bash):
 *   node scripts/ingest-prices.mjs bitcoin,ethereum,solana
 * Environment required:
 *   COINGECKO_API_KEY or CG_KEY (unless you rely on public rate-limit)
 *   BQ_KEY_B64 + GOOGLE_PROJECT_ID + BQ_PRICES_DATASET + BQ_PRICES_TABLE
 */
// Re-implement minimal Coingecko fetch + BigQuery insert locally to avoid TS imports.
import { getScriptBigQuery } from './_bq.js';
try { (await import('dotenv')).config(); } catch {}

async function fetchSimplePrices(ids, vs='usd') {
  const key = process.env.COINGECKO_API_KEY || process.env.CG_KEY;
  const base = 'https://api.coingecko.com/api/v3/simple/price';
  const url = `${base}?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=${vs}`;
  const headers = { 'Accept': 'application/json' };
  if (key) headers['x-cg-pro-api-key'] = key;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Coingecko fetch failed ' + res.status);
  return res.json();
}

async function insertPricesIntoBigQuery(prices, source='ingest') {
  const dataset = process.env.BQ_PRICES_DATASET;
  const table = process.env.BQ_PRICES_TABLE;
  if (!dataset || !table) return;
  const bq = getScriptBigQuery();
  const rows = Object.entries(prices).map(([id,p]) => ({ id, usd: p.usd, ts: new Date(), source }));
  if (!rows.length) return;
  await bq.dataset(dataset).table(table).insert(rows, { ignoreUnknownValues: true });
}

async function main() {
  const arg = process.argv[2] || 'bitcoin,ethereum,solana';
  const ids = arg.split(',').map(s=>s.trim()).filter(Boolean);
  if (!ids.length) { console.error('No ids'); process.exit(1); }
  const raw = await fetchSimplePrices(ids, 'usd');
  const mapped = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k,{ usd: v.usd }]));
  await insertPricesIntoBigQuery(mapped, 'ingest');
  console.log('Inserted', Object.keys(mapped).length, 'prices into BigQuery');
}
main().catch(e=>{ console.error(e); process.exit(1); });
