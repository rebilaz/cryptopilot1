import { TOKENS } from './tokens';

/**
 * Normalize user input asset symbol or id to canonical coingecko id when possible.
 * - Accepts symbol (e.g. BTC) or id (bitcoin) or synonym.
 * - Returns lowercase id or lowered raw input if unknown.
 * - Logs a warning for unknown symbols.
 */
export function normalizeAsset(input: string): string {
  const raw = (input||'').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const direct = TOKENS.find(t => t.symbol.toUpperCase() === upper || (t.synonyms||[]).some(s => s.toUpperCase() === upper));
  if (direct) return direct.id;
  const lower = raw.toLowerCase();
  const byId = TOKENS.find(t => t.id === lower);
  if (byId) return byId.id;
  console.warn('unknown symbol', input);
  return lower;
}
