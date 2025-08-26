import { getBigQuery } from './bigquery';

interface TokenRow { id: string; symbol: string; name: string }

function getClient() { return getBigQuery(); }

type CacheEntry = { at: number; row: TokenRow | null; list?: TokenRow[] };
const symbolCache = new Map<string, CacheEntry>();
const idCache = new Map<string, CacheEntry>();
const candidatesCache = new Map<string, CacheEntry>();
export function norm(s: string): string { return (s || '').trim().toLowerCase(); }
const TTL = parseInt(process.env.BQ_TOKEN_CACHE_TTL_MS || (24*60*60*1000).toString(), 10); // default 24h

function ds() { return process.env.BQ_DATASET || process.env.BQ_TOKENS_DATASET; }
function tbl() { return process.env.BQ_TOKEN_TABLE || process.env.BQ_TOKENS_TABLE; }

async function queryRowsSymbol(symbol: string, limit: number): Promise<TokenRow[]> {
  const dataset = ds(); const table = tbl();
  if (!dataset || !table) return [];
  const bq = getClient();
  const location = process.env.BQ_LOCATION;
  const query = `SELECT id, symbol, name FROM \`${dataset}.${table}\` WHERE LOWER(symbol)=LOWER(@symbol) ORDER BY updated_at DESC LIMIT ${limit}`;
  try {
    const [job] = await bq.createQueryJob({ query, location, params: { symbol } });
    const [rows] = await job.getQueryResults();
    return rows as any as TokenRow[];
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[bqTokens] query failed', (e as any)?.message);
    return [];
  }
}

export async function getBySymbol(symbol: string): Promise<TokenRow | null> {
  if (!symbol) return null;
  const key = symbol.toLowerCase();
  const now = Date.now();
  const cached = symbolCache.get(key);
  if (cached && now - cached.at < TTL) return cached.row;
  const rows = await queryRowsSymbol(symbol, 1);
  const row = rows[0] || null;
  symbolCache.set(key, { at: now, row });
  console.log('[bq] getBySymbol', symbol, '->', row?.id);
  return row;
}

export async function getCandidates(symbol: string): Promise<TokenRow[]> {
  if (!symbol) return [];
  const key = symbol.toLowerCase();
  const now = Date.now();
  const cached = candidatesCache.get(key);
  if (cached && now - cached.at < TTL && cached.list) return cached.list;
  const rows = await queryRowsSymbol(symbol, 5);
  candidatesCache.set(key, { at: now, row: rows[0] || null, list: rows });
  return rows;
}

export async function getById(id: string): Promise<TokenRow | null> {
  if (!id) return null;
  const key = norm(id);
  const now = Date.now();
  const cached = idCache.get(key);
  if (cached && now - cached.at < TTL) return cached.row;
  const dataset = ds(); const table = tbl();
  if (!dataset || !table) return null;
  const bq = getClient();
  const location = process.env.BQ_LOCATION;
  const query = `SELECT id, symbol, name FROM \`${dataset}.${table}\` WHERE LOWER(id)=LOWER(@id) LIMIT 1`;
  try {
    const [job] = await bq.createQueryJob({ query, location, params: { id } });
    const [rows] = await job.getQueryResults();
    const row = (rows as any as TokenRow[])[0] || null;
    idCache.set(key, { at: now, row });
    console.log('[bq] getById', id, '->', row?.id);
    return row;
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[bqTokens] getById failed', (e as any)?.message);
    idCache.set(key, { at: now, row: null });
    console.log('[bq] getById', id, '->', null);
    return null;
  }
}

export async function existsId(id: string): Promise<boolean> { return !!(await getById(id)); }
