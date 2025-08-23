// BigQuery helper (lazy client) - used to fetch token metadata list.
// Requires GOOGLE_APPLICATION_CREDENTIALS or explicit key JSON.
import { BigQuery } from '@google-cloud/bigquery';

let bq: BigQuery | null = null;

export function getBigQuery(): BigQuery {
  if (bq) return bq;
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const keyInput = process.env.BQ_KEY_FILE || process.env.BQ_KEY_B64; // support either explicit file path or legacy var

  if (keyInput) {
    try {
      let json: any;
      const looksLikePath = /[\\/]/.test(keyInput) || keyInput.trim().endsWith('.json');
      if (looksLikePath) {
        // Treat as filesystem path
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        const raw = fs.readFileSync(keyInput, 'utf8');
        json = JSON.parse(raw);
      } else {
        // Treat as base64 encoded JSON
        const decoded = Buffer.from(keyInput, 'base64').toString('utf8');
        json = JSON.parse(decoded);
      }
      bq = new BigQuery({
        projectId: projectId || json.project_id,
        credentials: {
          client_email: json.client_email,
          private_key: json.private_key,
        },
      });
    } catch (e) {
      console.error('BigQuery key load failed (file/base64). Falling back to default ADC.', e);
      bq = new BigQuery(projectId ? { projectId } : undefined as any);
    }
  } else {
    // Application Default Credentials (GCP runtime) or projectId if provided
    bq = new BigQuery(projectId ? { projectId } : undefined as any);
  }
  return bq;
}

export interface TokenRow {
  id: string; // coingecko id
  symbol: string;
  name: string;
  rank?: number | null;
  updated_at?: string | null;
}

export async function fetchTokenListFromBigQuery(dataset: string, table: string, limit = 5000): Promise<TokenRow[]> {
  const bigquery = getBigQuery();
  const location = process.env.BQ_LOCATION;
  const query = `SELECT id, symbol, name, rank, updated_at FROM \`${dataset}.${table}\` ORDER BY rank NULLS LAST, symbol LIMIT ${limit}`;
  try {
    const [job] = await bigquery.createQueryJob({ query, location });
    const [rows] = await job.getQueryResults();
    return rows as TokenRow[];
  } catch (e) {
    // Fallback to table rows (no jobUser permission required)
    if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens fetch fallback] using table.getRows()', (e as any)?.message);
    try {
      const [rows] = await bigquery.dataset(dataset).table(table).getRows({ maxResults: limit });
      return rows as TokenRow[];
    } catch (e2) {
      if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.error('[tokens fetch fallback] failed', (e2 as any)?.message);
      throw e2;
    }
  }
}

export async function searchTokensBigQuery(dataset: string, table: string, q: string, limit = 200): Promise<TokenRow[]> {
  const bigquery = getBigQuery();
  const location = process.env.BQ_LOCATION;
  // Basic case-insensitive prefix/contains search. Use parameter to avoid injection.
  // Prioritize exact symbol match, then symbol prefix, then name/id contains; order by rank.
  const query = `
    WITH base AS (
      SELECT id, symbol, name, rank, updated_at,
        CASE
          WHEN LOWER(symbol) = @q THEN 100
          WHEN LOWER(symbol) LIKE CONCAT(@q, '%') THEN 80
          WHEN LOWER(id) LIKE CONCAT(@q, '%') THEN 60
          WHEN LOWER(name) LIKE CONCAT(@q, '%') THEN 40
          WHEN LOWER(symbol) LIKE CONCAT('%', @q, '%') THEN 25
          WHEN LOWER(name) LIKE CONCAT('%', @q, '%') THEN 15
          WHEN LOWER(id) LIKE CONCAT('%', @q, '%') THEN 10
          ELSE 0 END AS s
      FROM \`${dataset}.${table}\`
      WHERE (
        LOWER(symbol) LIKE CONCAT(@q, '%') OR
        LOWER(name) LIKE CONCAT('%', @q, '%') OR
        LOWER(id) LIKE CONCAT(@q, '%')
      )
    )
    SELECT id, symbol, name, rank, updated_at FROM base
    WHERE s > 0
    ORDER BY s DESC, rank NULLS LAST, symbol
    LIMIT ${limit}`;
  try {
    const [job] = await bigquery.createQueryJob({ query, location, params: { q: q.toLowerCase() } });
    const [rows] = await job.getQueryResults();
    return rows as TokenRow[];
  } catch (e) {
    // Fallback: read subset of rows and filter in JS (less efficient but avoids job permission).
    if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens search fallback] table.getRows()', (e as any)?.message);
    const [rows] = await bigquery.dataset(dataset).table(table).getRows({ maxResults: 5000 });
    const ql = q.toLowerCase();
    const filtered = (rows as TokenRow[]).filter(r => r.symbol?.toLowerCase().startsWith(ql) || r.name?.toLowerCase().includes(ql) || r.id?.toLowerCase().startsWith(ql));
    return filtered.slice(0, limit);
  }
}

export async function upsertTokenMeta(dataset: string, table: string, row: TokenRow) {
  const bq = getBigQuery();
  const location = process.env.BQ_LOCATION;
  // Use MERGE to avoid duplicates; fallback to insert on error.
  const query = `MERGE \`${dataset}.${table}\` T USING (SELECT @id AS id, @symbol AS symbol, @name AS name, @rank AS rank, @updated_at AS updated_at) S
    ON T.id = S.id
    WHEN MATCHED THEN UPDATE SET symbol=S.symbol, name=S.name, rank=S.rank, updated_at=S.updated_at
    WHEN NOT MATCHED THEN INSERT (id,symbol,name,rank,updated_at) VALUES (S.id,S.symbol,S.name,S.rank,S.updated_at)`;
  try {
    await bq.createQueryJob({ query, location, params: { id: row.id, symbol: row.symbol, name: row.name, rank: row.rank ?? null, updated_at: row.updated_at || new Date().toISOString() } });
  } catch (e) {
    try {
      await bq.dataset(dataset).table(table).insert([{ id: row.id, symbol: row.symbol, name: row.name, rank: row.rank ?? null, updated_at: row.updated_at || new Date() }], { ignoreUnknownValues: true });
    } catch {}
  }
}

// ---------- Auto bootstrap (dev convenience) ----------
let tokensBootstrapPromise: Promise<void> | null = null;
let tokensBootstrapDebug: any = null; // expose last run summary

export async function ensureTokensTableExists() {
  const dataset = process.env.BQ_TOKENS_DATASET;
  const table = process.env.BQ_TOKENS_TABLE;
  if (!dataset || !table) return false;
  try {
    const bq = getBigQuery();
    const ds = bq.dataset(dataset);
    const [dsExists] = await ds.exists();
    if (!dsExists) {
      await ds.create({ location: process.env.BQ_LOCATION });
      if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens bootstrap] dataset created', dataset);
    }
    const tbl = ds.table(table);
    const [exists] = await tbl.exists();
    if (!exists) {
      await tbl.create({
        schema: {
          fields: [
            { name: 'id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'symbol', type: 'STRING' },
            { name: 'name', type: 'STRING' },
            { name: 'rank', type: 'INTEGER' },
            { name: 'updated_at', type: 'TIMESTAMP' }
          ]
        }
      });
      if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens bootstrap] table created', `${dataset}.${table}`);
    }
    return true;
  } catch (e) {
    console.error('[tokens bootstrap] ensure table exists failed', e);
    return false;
  }
}

async function countTokens(dataset: string, table: string): Promise<number> {
  const bq = getBigQuery();
  const location = process.env.BQ_LOCATION;
  const query = `SELECT COUNT(1) AS c FROM \`${dataset}.${table}\``;
  try {
    const [job] = await bq.createQueryJob({ query, location });
    const [rows] = await job.getQueryResults();
    return Number(rows[0]?.c || 0);
  } catch (e: any) {
    // Fallback: use table metadata (approximate numRows) - no jobUser needed
    try {
      const [metadata] = await bq.dataset(dataset).table(table).getMetadata();
      const n = Number((metadata as any).numRows || 0);
      if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens bootstrap] fallback metadata row count', n);
      return n;
    } catch {
      throw e;
    }
  }
}

async function truncateTokensTable(dataset: string, table: string) {
  const bq = getBigQuery();
  const location = process.env.BQ_LOCATION;
  const query = `TRUNCATE TABLE \`${dataset}.${table}\``;
  try {
    await bq.createQueryJob({ query, location });
    if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens bootstrap] truncated via query');
  } catch (e:any) {
    // Fallback: delete & recreate table (needs dataEditor but pas jobUser)
    if (process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true') console.log('[tokens bootstrap] truncate fallback drop+recreate', e?.message);
    const ds = bq.dataset(dataset);
    const tbl = ds.table(table);
    try { await tbl.delete(); } catch {}
    await tbl.create({
      schema: {
        fields: [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'symbol', type: 'STRING' },
          { name: 'name', type: 'STRING' },
          { name: 'rank', type: 'INTEGER' },
          { name: 'updated_at', type: 'TIMESTAMP' }
        ]
      }
    });
  }
}

async function fetchFullCoingeckoList(): Promise<TokenRow[]> {
  const key = process.env.COINGECKO_API_KEY || process.env.CG_KEY;
  const headers: Record<string,string> = { 'Accept': 'application/json' };
  if (key) headers['x-cg-pro-api-key'] = key;
  const res = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=false', { headers, cache: 'no-store' });
  if (!res.ok) throw new Error('Full list fetch failed: '+res.status);
  const json: any[] = await res.json();
  const now = new Date().toISOString();
  return json.map(c => ({ id: c.id, symbol: (c.symbol||'').toUpperCase(), name: c.name, rank: null, updated_at: now }));
}

export async function ensureTokensBootstrapped() {
  if (tokensBootstrapPromise) return tokensBootstrapPromise;
  if (process.env.AUTO_SYNC_TOKENS_ON_START !== 'true') return; // feature toggle
  const dataset = process.env.BQ_TOKENS_DATASET;
  const table = process.env.BQ_TOKENS_TABLE;
  if (!dataset || !table) return;
  tokensBootstrapPromise = (async () => {
    try {
      const verbose = process.env.AUTO_SYNC_TOKENS_VERBOSE === 'true';
      if (verbose) console.log('[tokens bootstrap] start', { dataset, table });
  await ensureTokensTableExists();
      const min = parseInt(process.env.TOKENS_BOOT_MIN || '500', 10);
      const current = await countTokens(dataset, table).catch(()=>min); // if count fails assume already ok
      if (verbose) console.log('[tokens bootstrap] current count', current, 'min threshold', min);
      if (current >= min) { if (verbose) console.log('[tokens bootstrap] skip (already >= min)'); return; }
      const list = await fetchFullCoingeckoList();
      if (verbose) console.log('[tokens bootstrap] fetched full list', list.length);
      const enrichPages = parseInt(process.env.TOKENS_BOOT_MARKET_PAGES || '6', 10);
      if (enrichPages > 0) {
        const key = process.env.COINGECKO_API_KEY || process.env.CG_KEY;
        const headers: Record<string,string> = { 'Accept': 'application/json' };
        if (key) headers['x-cg-pro-api-key'] = key;
        const perPage = 250;
        const rankMap = new Map<string, number | null>();
        for (let p=1; p<=enrichPages; p++) {
          const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=false`, { headers, cache: 'no-store' });
            if (!r.ok) break;
          const mj: any[] = await r.json();
          for (const m of mj) if (!rankMap.has(m.id)) rankMap.set(m.id, m.market_cap_rank || null);
          if (mj.length < perPage) break;
        }
        list.forEach(t => { if (rankMap.has(t.id)) (t as any).rank = rankMap.get(t.id); });
        if (verbose) console.log('[tokens bootstrap] enriched ranks size', rankMap.size);
      }
      const bq = getBigQuery();
      // TRUNCATE then insert
  await truncateTokensTable(dataset, table);
      const tbl = bq.dataset(dataset).table(table);
      const CHUNK = 500;
      let inserted = 0;
      let firstError: string | null = null;
      for (let i=0;i<list.length;i+=CHUNK) {
        const slice = list.slice(i,i+CHUNK);
        try {
          await tbl.insert(slice, { ignoreUnknownValues: true });
          inserted += slice.length;
          if (verbose) console.log('[tokens bootstrap] inserted batch', i, '/', list.length);
        } catch (e:any) {
          if (!firstError) firstError = e?.message || String(e);
          if (verbose) console.error('[tokens bootstrap] insert batch failed', i, e?.errors || e?.message || e);
        }
      }
      // eslint-disable-next-line no-console
      console.log('[tokens bootstrap] Inserted', inserted, 'of', list.length, 'tokens');
      tokensBootstrapDebug = { attempted: list.length, inserted, firstError, time: new Date().toISOString() };
    } catch (e) {
      console.error('[tokens bootstrap] failed', e);
      tokensBootstrapDebug = { failed: true, error: (e as any)?.message || String(e), time: new Date().toISOString() };
    }
  })();
  return tokensBootstrapPromise;
}

export function getTokensBootstrapDebug() { return tokensBootstrapDebug; }
