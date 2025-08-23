#!/usr/bin/env node
/**
 * Init BigQuery datasets & tables if missing.
 * Uses env vars:
 *  GOOGLE_PROJECT_ID (optional if in key)
 *  BQ_KEY_B64 (service account JSON base64)
 *  BQ_LOCATION (ex: EU or US)
 *  BQ_TOKENS_DATASET / BQ_TOKENS_TABLE (optional)
 *  BQ_PRICES_DATASET / BQ_PRICES_TABLE
 *
 * Run:
 *   node scripts/init-bigquery.mjs
 */
import { getScriptBigQuery } from './_bq.js';
// Dotenv already loaded in _bq, but we can enforce again (no harm)
try { (await import('dotenv')).config(); } catch {}

const bq = getScriptBigQuery();
const location = process.env.BQ_LOCATION || 'US';
const verbose = process.env.INIT_VERBOSE !== 'false';

async function ensureDataset(name) {
  if (!name) return;
  try {
    const ds = bq.dataset(name, { location });
    const [exists] = await ds.exists();
    if (!exists) {
      if (verbose) console.log('[dataset] creating', name, 'location', location);
      await ds.create({ location });
      console.log('Created dataset', name);
    } else {
      if (verbose) console.log('Dataset ok', name);
    }
  } catch (e) {
    console.error('Dataset create/check failed:', name, e.message || e);
  }
}

async function ensureTable(dataset, table, schemaSql) {
  if (!dataset || !table) return;
  try {
    const ds = bq.dataset(dataset);
    const tbl = ds.table(table);
    const [exists] = await tbl.exists();
    if (exists) { if (verbose) console.log('Table ok', `${dataset}.${table}`); return; }
    if (verbose) console.log('[table] creating', `${dataset}.${table}`);
    await tbl.create({ schema: schemaSql, timePartitioning: { type: 'DAY' }, clustering: schemaSql.clusteringFields ? { fields: schemaSql.clusteringFields } : undefined });
    console.log('Created table', `${dataset}.${table}`);
  } catch (e) {
    console.error('Table create failed:', `${dataset}.${table}`, e.message || e);
  }
}

async function main() {
  const tokensDs = process.env.BQ_TOKENS_DATASET;
  const tokensTable = process.env.BQ_TOKENS_TABLE;
  const pricesDs = process.env.BQ_PRICES_DATASET;
  const pricesTable = process.env.BQ_PRICES_TABLE;

  if (!pricesDs || !pricesTable) {
    console.error('BQ_PRICES_DATASET / BQ_PRICES_TABLE required');
  }

  if (verbose) {
    console.log('== Init BigQuery ==');
    console.log('Project:', process.env.GOOGLE_PROJECT_ID || '(from key)');
    console.log('Location:', location);
    console.log('Tokens:', tokensDs, tokensTable);
    console.log('Prices:', pricesDs, pricesTable);
  }

  await ensureDataset(tokensDs);
  await ensureDataset(pricesDs);

  // Basic schemas (JS object form accepted by @google-cloud/bigquery)
  await ensureTable(tokensDs, tokensTable, {
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'symbol', type: 'STRING' },
      { name: 'name', type: 'STRING' },
      { name: 'rank', type: 'INT64' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ]
  });

  await ensureTable(pricesDs, pricesTable, {
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'ts', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'usd', type: 'FLOAT64' },
      { name: 'source', type: 'STRING' }
    ]
  });

  console.log('Init complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
