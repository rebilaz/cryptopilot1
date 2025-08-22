// BigQuery helper (lazy client) - used to fetch token metadata list.
// Requires GOOGLE_APPLICATION_CREDENTIALS or explicit key JSON.
import { BigQuery } from '@google-cloud/bigquery';

let bq: BigQuery | null = null;

export function getBigQuery(): BigQuery {
  if (bq) return bq;
  const b64 = process.env.BQ_KEY_B64;
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      bq = new BigQuery({
        projectId: projectId || json.project_id,
        credentials: {
          client_email: json.client_email,
          private_key: json.private_key,
        },
      });
    } catch (e) {
      console.error('BQ_KEY_B64 parse error, fallback default client', e);
      bq = new BigQuery(projectId ? { projectId } : undefined as any);
    }
  } else {
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
  const query = `SELECT id, symbol, name, rank, updated_at FROM \`${dataset}.${table}\` ORDER BY rank NULLS LAST LIMIT ${limit}`;
  const [job] = await bigquery.createQueryJob({ query, location });
  const [rows] = await job.getQueryResults();
  return rows as TokenRow[];
}
