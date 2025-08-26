import { BigQuery } from '@google-cloud/bigquery';

const ENABLED = (process.env.BIGQUERY_LOGGING_ENABLED || '').toLowerCase() === 'true';
const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET || 'projectscanner';
const TABLE = process.env.BIGQUERY_TABLE || 'portfolio_transactions';

let client: BigQuery | null = null;
let ensured = false;
let ensurePromise: Promise<void> | null = null;

// In-memory retry buffer
interface PendingInsert { row: TransactionBQRow; attempt: number; }
const BUFFER_LIMIT = 100;
const pending: PendingInsert[] = [];
let retryTimer: NodeJS.Timeout | null = null;

export interface TransactionBQRow {
  userId: string;
  portfolioId: string;
  action: string;
  symbol: string | null;
  assetId: string | null;
  delta: number | null;
  beforeAmt: number | null;
  afterAmt: number | null;
  price: number | null;
  meta: any;
  source: string | null;
  createdAt: Date;
  insertId?: string;
}

export function initBigQuery(): BigQuery | null {
  if (!ENABLED) return null;
  if (client) return client;
  try {
    client = new BigQuery({ projectId: PROJECT_ID || undefined });
  } catch (e) {
    console.warn('[bq] init failed', e);
    client = null;
  }
  return client;
}

async function ensureDatasetAndTable() {
  if (!ENABLED) return;
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  const c = initBigQuery();
  if (!c) return;
  ensurePromise = (async () => {
    try {
      const [datasets] = await c.getDatasets();
      const hasDs = datasets.some(d => d.id === DATASET);
      if (!hasDs) {
        await c.createDataset(DATASET, { location: process.env.BIGQUERY_LOCATION || 'US' });
        console.log('[bq] dataset created', DATASET);
      }
      const ds = c.dataset(DATASET);
      const [tables] = await ds.getTables();
      const hasTable = tables.some(t => t.id === TABLE);
      if (!hasTable) {
        await ds.createTable(TABLE, {
          schema: {
            fields: [
              { name: 'userId', type: 'STRING' },
              { name: 'portfolioId', type: 'STRING' },
              { name: 'action', type: 'STRING' },
              { name: 'symbol', type: 'STRING' },
              { name: 'assetId', type: 'STRING' },
              { name: 'delta', type: 'FLOAT' },
              { name: 'beforeAmt', type: 'FLOAT' },
              { name: 'afterAmt', type: 'FLOAT' },
              { name: 'price', type: 'FLOAT' },
              { name: 'meta', type: 'JSON' },
              { name: 'source', type: 'STRING' },
              { name: 'createdAt', type: 'TIMESTAMP' }
            ]
          },
          timePartitioning: { type: 'DAY', field: 'createdAt' }
        });
        console.log('[bq] table created', `${DATASET}.${TABLE}`);
      }
      ensured = true;
    } catch (e) {
      console.warn('[bq] ensure failed', e);
    }
  })();
  await ensurePromise;
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setInterval(async () => {
    if (!pending.length) return;
    const item = pending.shift();
    if (!item) return;
    await doInsert(item.row, item.attempt + 1);
    if (!pending.length && retryTimer) { clearInterval(retryTimer); retryTimer = null; }
  }, 5000);
}

async function doInsert(row: TransactionBQRow, attempt = 0) {
  if (!ENABLED) return;
  const c = initBigQuery();
  if (!c) return;
  await ensureDatasetAndTable();
  const ds = c.dataset(DATASET); const tbl = ds.table(TABLE);
  const insertId = row.insertId || `${row.portfolioId}:${row.action}:${row.assetId}:${row.createdAt.getTime()}`;
  try {
    await tbl.insert([{ ...row, insertId }], { raw: true, ignoreUnknownValues: true, skipInvalidRows: true });
    console.log('bq insert ok', { action: row.action, assetId: row.assetId, insertId });
  } catch (e: any) {
    console.warn('bq insert error', { attempt, error: e?.errors || e?.message || e });
    if (attempt < 5) {
      if (pending.length < BUFFER_LIMIT) pending.push({ row: { ...row, insertId }, attempt });
      scheduleRetry();
    }
  }
}

export function logTransactionBQ(row: TransactionBQRow) {
  try { void doInsert(row, 0); } catch (e) { console.warn('bq enqueue fail', e); }
}

export function buildTxnRow(args: {
  userId: string; portfolioId: string; action: string; symbolInput?: string; assetId?: string; delta?: number; beforeAmt?: number; afterAmt?: number; price?: number | null; meta?: any; source?: string;
}): TransactionBQRow {
  const createdAt = new Date();
  return {
    userId: args.userId,
    portfolioId: args.portfolioId,
    action: args.action,
    symbol: args.symbolInput || null,
    assetId: args.assetId || null,
    delta: typeof args.delta === 'number' ? args.delta : null,
    beforeAmt: typeof args.beforeAmt === 'number' ? args.beforeAmt : null,
    afterAmt: typeof args.afterAmt === 'number' ? args.afterAmt : null,
    price: typeof args.price === 'number' ? args.price : null,
    meta: args.meta || null,
    source: args.source || null,
    createdAt,
    insertId: `${args.portfolioId}:${args.action}:${args.assetId}:${createdAt.getTime()}`
  };
}
