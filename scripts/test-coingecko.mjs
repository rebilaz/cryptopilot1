#!/usr/bin/env node
/**
 * Simple Coingecko API connectivity & rate/basic data test.
 * - Reads COINGECKO_API_KEY from process.env (optional)
 * - Fetches /ping then /simple/price for a small set
 * - Prints structured result + basic latency metrics
 */

import https from 'node:https';

const API_BASE = 'https://api.coingecko.com/api/v3';
const KEY = process.env.COINGECKO_API_KEY || '';

function fetchJson(path) {
  const url = `${API_BASE}${path}`;
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const headers = {};
    if (KEY) headers['x-cg-pro-api-key'] = KEY;
    https
      .get(url, { headers }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          const ms = Date.now() - started;
            try {
              const json = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
              }
              resolve({ json, ms, status: res.statusCode });
            } catch (e) {
              reject(new Error(`Invalid JSON (status ${res.statusCode}): ${e.message}\nBody: ${data}`));
            }
        });
      })
      .on('error', reject);
  });
}

(async () => {
  console.log('--- Coingecko API Test ---');
  console.log('Key present:', KEY ? 'yes (length ' + KEY.length + ')' : 'no');

  try {
    const ping = await fetchJson('/ping');
    console.log('Ping OK', { status: ping.status, ms: ping.ms, gecko_says: ping.json.gecko_says });

    const price = await fetchJson('/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd,eur');
    console.log('Prices', price.json);

    // Basic sanity checks
    const btcUsd = price.json?.bitcoin?.usd;
    if (typeof btcUsd !== 'number' || btcUsd <= 0) {
      console.error('Unexpected BTC USD price value:', btcUsd);
      process.exitCode = 2;
    }

    console.log('Latency ms: { ping:', ping.ms, ', price:', price.ms, ' }');
    console.log('Success.');
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exitCode = 1;
  }
})();
