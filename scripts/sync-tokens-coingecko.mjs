#!/usr/bin/env node
/**
 * Synchronise la liste des tokens depuis Coingecko vers BigQuery.
 * Deux modes:
 *   - Mode partiel (par défaut): top market cap via /coins/markets (pagé)
 *   - Mode complet (TOKEN_SYNC_FULL=true): TOUTE la liste via /coins/list (~10k+), puis enrichissement partiel des ranks (pages markets optionnelles)
 * Objectif: suggestions riches sans requêtes externes répétées.
 *
 * ENV requis:
 *   BQ_KEY_B64 ou BQ_KEY_FILE (ou ADC), GOOGLE_PROJECT_ID (si non dans la clé)
 *   BQ_TOKENS_DATASET, BQ_TOKENS_TABLE
 *
 * ENV optionnels:
 *   COINGECKO_API_KEY / CG_KEY       -> clé pro
 *   TOKEN_SYNC_PAGES=3               -> pages markets à récupérer (mode partiel) (250 par page)
 *   TOKEN_SYNC_TRUNCATE=true         -> TRUNCATE la table avant insert
 *   TOKEN_SYNC_FULL=true             -> active le mode complet (utilise /coins/list)
 *   TOKEN_SYNC_MARKET_PAGES=8        -> si FULL=true, nb de pages markets pour récupérer les ranks des principaux actifs (sinon 0 = aucun enrichissement rank)
 *   TOKEN_SYNC_BATCH=500             -> taille d'insert BigQuery (défaut 500)
 *
 * Usage:
 *   node scripts/sync-tokens-coingecko.mjs            (top tokens)
 *   TOKEN_SYNC_FULL=true node scripts/sync-tokens-coingecko.mjs   (tous les tokens)
 */
import { getScriptBigQuery } from './_bq.js';
try { (await import('dotenv')).config(); } catch {}

const API_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets';
const API_LIST = 'https://api.coingecko.com/api/v3/coins/list?include_platform=false';

function getKey() { return process.env.COINGECKO_API_KEY || process.env.CG_KEY; }

async function fetchMarketPage(page, perPage=250) {
  const url = `${API_MARKETS}?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`; // id,symbol,name,market_cap_rank
  const headers = { 'Accept': 'application/json' };
  const key = getKey();
  if (key) headers['x-cg-pro-api-key'] = key;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Fetch page failed p'+page+': '+res.status);
  const json = await res.json();
  return json.map(c => ({ id: c.id, symbol: c.symbol?.toUpperCase(), name: c.name, rank: c.market_cap_rank || null, updated_at: new Date() }));
}

async function fetchFullList() {
  const headers = { 'Accept': 'application/json' };
  const key = getKey();
  if (key) headers['x-cg-pro-api-key'] = key;
  const res = await fetch(API_LIST, { headers });
  if (!res.ok) throw new Error('Fetch full list failed: '+res.status);
  /** @type {{id:string; symbol:string; name:string;}[]} */
  const json = await res.json();
  const now = new Date();
  return json.map(c => ({ id: c.id, symbol: c.symbol?.toUpperCase(), name: c.name, rank: null, updated_at: now }));
}

async function main() {
  const dataset = process.env.BQ_TOKENS_DATASET;
  const table = process.env.BQ_TOKENS_TABLE;
  if (!dataset || !table) throw new Error('BQ_TOKENS_DATASET / BQ_TOKENS_TABLE manquants');
  const full = process.env.TOKEN_SYNC_FULL === 'true';
  let finalRows = [];
  if (full) {
    console.log('Mode FULL: récupération de toute la liste des tokens...');
    const baseList = await fetchFullList();
    console.log('Liste brute:', baseList.length, 'tokens');
    const enrichPages = parseInt(process.env.TOKEN_SYNC_MARKET_PAGES || '8', 10);
    if (enrichPages > 0) {
      console.log('Enrichissement ranks via', enrichPages, 'pages markets...');
      const perPage = 250;
      const rankMap = new Map();
      for (let p=1; p<=enrichPages; p++) {
        const rows = await fetchMarketPage(p, perPage);
        for (const r of rows) {
          if (!rankMap.has(r.id)) rankMap.set(r.id, r.rank);
        }
        if (rows.length < perPage) break;
      }
      for (const t of baseList) {
        if (rankMap.has(t.id)) t.rank = rankMap.get(t.id);
      }
    }
    finalRows = baseList;
  } else {
    const pages = parseInt(process.env.TOKEN_SYNC_PAGES || '3', 10);
    const perPage = 250;
    const all = [];
    for (let p=1; p<=pages; p++) {
      const rows = await fetchMarketPage(p, perPage);
      all.push(...rows);
      if (rows.length < perPage) break; // fin plus tôt
    }
    // Dédupliquer par id conservant plus petit rank
    const map = new Map();
    for (const r of all) {
      if (!map.has(r.id)) map.set(r.id, r); else {
        const ex = map.get(r.id);
        if ((r.rank||9e9) < (ex.rank||9e9)) map.set(r.id, r);
      }
    }
    finalRows = Array.from(map.values());
  }
  console.log('Rows à insérer:', finalRows.length, '| Exemple:', finalRows[0]);
  const bq = getScriptBigQuery();
  // Optionnel: TRUNCATE
  if (process.env.TOKEN_SYNC_TRUNCATE === 'true') {
    const query = `TRUNCATE TABLE \`${dataset}.${table}\``;
    await bq.createQueryJob({ query, location: process.env.BQ_LOCATION });
    console.log('Table tronquée');
  }
  // Insert par batch (streaming)
  const tbl = bq.dataset(dataset).table(table);
  const CHUNK = parseInt(process.env.TOKEN_SYNC_BATCH || '500', 10);
  for (let i=0;i<finalRows.length;i+=CHUNK) {
    const slice = finalRows.slice(i,i+CHUNK);
    await tbl.insert(slice, { ignoreUnknownValues: true });
    console.log('Insert batch', i, '/', finalRows.length);
  }
  console.log('Terminé.');
}

main().catch(e => { console.error(e); process.exit(1); });
