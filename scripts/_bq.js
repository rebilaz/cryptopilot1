// Lightweight BigQuery client bootstrap for Node scripts (no TS import required)
import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
// Always attempt to load .env early
try { if (!process.env.__DOTENV_LOADED) { (await import('dotenv')).config(); process.env.__DOTENV_LOADED='1'; } } catch {}

function loadServiceAccount() {
  const keyFile = process.env.BQ_KEY_FILE;
  const keyData = process.env.BQ_KEY_B64;
  if (keyFile) {
    const raw = fs.readFileSync(keyFile, 'utf8');
    return JSON.parse(raw);
  }
  if (keyData) {
    // Accept: base64, raw JSON, or path mistakenly put in BQ_KEY_B64
    if (/[\\/].*\.json$/i.test(keyData.trim())) {
      const raw = fs.readFileSync(keyData.trim(), 'utf8');
      return JSON.parse(raw);
    }
    if (keyData.trim().startsWith('{')) return JSON.parse(keyData);
    const decoded = Buffer.from(keyData, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
  return null;
}

export function getScriptBigQuery() {
  const projectIdEnv = process.env.GOOGLE_PROJECT_ID;
  let creds = null;
  try { creds = loadServiceAccount(); } catch (e) { console.error('BigQuery key parse failed:', e.message || e); }
  if (creds) {
    return new BigQuery({ projectId: projectIdEnv || creds.project_id, credentials: { client_email: creds.client_email, private_key: creds.private_key } });
  }
  return new BigQuery(projectIdEnv ? { projectId: projectIdEnv } : undefined);
}
