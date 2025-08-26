import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { normalizeAsset } from '@/lib/prices/normalizeAsset';
import { TOKENS } from '@/lib/prices/tokens';
import { buildTxnRow, logTransactionBQ } from '@/lib/bq';
import { resolveAssetId } from '@/lib/resolveAssetId';

export type WriteLike = { id?: string; assetId: string; symbol?: string; beforeAmt?: number; afterAmt?: number; delta?: number };

interface OpResult<T=any> { ok: boolean; error?: string; data?: T; writes?: WriteLike[] }

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function toFixedQty(n: number) { return Number(n.toFixed(8)); }

async function getPortfolioAndPositions(userId: string) {
  let pf = await prisma.portfolio.findFirst({ where: { userId }, include: { positions: true } });
  if (!pf) {
    pf = await prisma.portfolio.create({ data: { userId, label: 'Mon portefeuille' }, include: { positions: true } });
  }
  return pf;
}

async function resolvePriceMap(assetIds: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(assetIds.filter(Boolean)));
  if (!unique.length) return {};
  try {
    // Attempt internal fetch (requires absolute URL in server context if no fetch local). Fallback to empty.
    const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL && ('https://' + process.env.VERCEL_URL) || 'http://localhost:3000';
    const url = `${base.replace(/\/$/, '')}/api/prices?ids=${encodeURIComponent(unique.join(','))}&vs=usd`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    const out: Record<string, number> = {};
    for (const k of Object.keys(json||{})) {
      const v = json[k];
      if (v && typeof v.usd === 'number') out[k] = v.usd;
    }
    return out;
  } catch { return {}; }
}

function parseAmount(raw: any): number {
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) throw new Error('invalid_amount');
  return v;
}

export async function addPosition(userId: string, input: { assetId: string; amount: any; source?: string }): Promise<OpResult<{ id: string; assetId: string; amount: number }>> {
  try {
    const pf = await getPortfolioAndPositions(userId);
    const rawSymbol = input.assetId || '';
    const canonicalId = normalizeAsset(rawSymbol);
    const chain = rawSymbol.toUpperCase(); // always store chain = UPPERCASE(symbol saisi)
    const amountToAdd = parseAmount(input.amount);
    const variants = Array.from(new Set([canonicalId, rawSymbol, rawSymbol.toUpperCase(), rawSymbol.toLowerCase()].filter(Boolean)));
    const variantPositions = await prisma.position.findMany({ where: { portfolioId: pf.id, asset: { in: variants } } });

    if (variantPositions.length > 1) {
      // Merge legacy variants
      const beforeTotal = variantPositions.reduce((s,p)=> s + p.amount.toNumber(), 0);
      const afterAmt = toFixedQty(beforeTotal + amountToAdd);
      // Prefer canonical row to keep
      let keep = variantPositions.find(p => p.asset === canonicalId) || variantPositions[0];
      const toDelete = variantPositions.filter(p => p.id !== keep.id);
      // Update kept row to canonical asset & new amount + chain symbol
      const updated = await prisma.position.update({ where: { id: keep.id }, data: { asset: canonicalId, chain, amount: new Prisma.Decimal(afterAmt) } });
      if (toDelete.length) {
        await prisma.position.deleteMany({ where: { id: { in: toDelete.map(p=>p.id) } } });
      }
      console.log('merge variants', { canonicalId, merged: variantPositions.map(v=>v.id) });
      console.log('txn', { action: 'add_position', assetId: canonicalId, delta: amountToAdd, beforeAmt: beforeTotal, afterAmt });
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'add_position', symbolInput: chain, assetId: canonicalId, delta: amountToAdd, beforeAmt: beforeTotal, afterAmt, price: null, meta: { source: input.source || 'service', merged: variantPositions.map(v=>v.id) }, source: input.source || 'service' }));
      return { ok: true, data: { id: updated.id, assetId: canonicalId, amount: afterAmt }, writes: [{ id: updated.id, assetId: canonicalId, symbol: chain, beforeAmt: beforeTotal, afterAmt, delta: amountToAdd }] };
    }

    // Zero or one row cases
    if (variantPositions.length === 1) {
      const existing = variantPositions[0];
      const beforeAmt = existing.amount.toNumber();
      const afterAmt = toFixedQty(beforeAmt + amountToAdd);
      const updated = await prisma.position.update({ where: { id: existing.id }, data: { asset: canonicalId, chain, amount: new Prisma.Decimal(afterAmt) } });
      // backfill canonical cg id from BQ if different
      try {
        const cgId = await resolveAssetId({ assetId: existing.asset, symbol: chain });
        if (cgId && cgId !== updated.asset) {
          await prisma.position.update({ where: { id: updated.id }, data: { asset: cgId } });
          console.log('[backfill] position', updated.id, '->', cgId);
        }
      } catch {}
      if (existing.asset !== canonicalId) {
        console.log('merge variants', { canonicalId, merged: [existing.id] });
      }
      console.log('txn', { action: 'add_position', assetId: canonicalId, delta: amountToAdd, beforeAmt, afterAmt });
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'add_position', symbolInput: chain, assetId: canonicalId, delta: amountToAdd, beforeAmt, afterAmt, price: null, meta: { source: input.source || 'service' }, source: input.source || 'service' }));
      return { ok: true, data: { id: updated.id, assetId: canonicalId, amount: afterAmt }, writes: [{ id: updated.id, assetId: canonicalId, symbol: chain, beforeAmt, afterAmt, delta: amountToAdd }] };
    }

    // Create new
    const created = await prisma.position.create({ data: { portfolioId: pf.id, asset: canonicalId, chain, amount: new Prisma.Decimal(amountToAdd), source: input.source || 'service' } });
    console.log('txn', { action: 'add_position', assetId: canonicalId, delta: amountToAdd, beforeAmt: 0, afterAmt: amountToAdd });
    logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'add_position', symbolInput: chain, assetId: canonicalId, delta: amountToAdd, beforeAmt: 0, afterAmt: amountToAdd, price: null, meta: { source: input.source || 'service' }, source: input.source || 'service' }));
    return { ok: true, data: { id: created.id, assetId: canonicalId, amount: amountToAdd }, writes: [{ id: created.id, assetId: canonicalId, symbol: chain, beforeAmt: 0, afterAmt: amountToAdd, delta: amountToAdd }] };
  } catch (e:any) {
    return { ok: false, error: e?.message || 'add_failed' };
  }
}

export async function setQuantity(userId: string, assetIdRaw: string, amountRaw: any, source?: string): Promise<OpResult<{ id: string; assetId: string; amount: number }>> {
  try {
    const pf = await getPortfolioAndPositions(userId);
    const rawSymbol = assetIdRaw || '';
    const canonicalId = normalizeAsset(rawSymbol);
    const chain = rawSymbol.toUpperCase();
    const targetAmount = parseAmount(amountRaw);
    const variants = Array.from(new Set([canonicalId, rawSymbol, rawSymbol.toUpperCase(), rawSymbol.toLowerCase()].filter(Boolean)));
    const variantPositions = await prisma.position.findMany({ where: { portfolioId: pf.id, asset: { in: variants } } });

    if (variantPositions.length > 1) {
      const beforeTotal = variantPositions.reduce((s,p)=> s + p.amount.toNumber(), 0);
      const afterAmt = toFixedQty(targetAmount); // per spec: = amount si setQuantity (ignore sum except for before)
      let keep = variantPositions.find(p => p.asset === canonicalId) || variantPositions[0];
      const toDelete = variantPositions.filter(p => p.id !== keep.id);
      const updated = await prisma.position.update({ where: { id: keep.id }, data: { asset: canonicalId, chain, amount: new Prisma.Decimal(afterAmt) } });
      if (toDelete.length) await prisma.position.deleteMany({ where: { id: { in: toDelete.map(p=>p.id) } } });
      console.log('merge variants', { canonicalId, merged: variantPositions.map(v=>v.id) });
      const delta = afterAmt - beforeTotal;
      console.log('txn', { action: 'update_quantity', assetId: canonicalId, delta, beforeAmt: beforeTotal, afterAmt });
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'update_quantity', symbolInput: chain, assetId: canonicalId, delta, beforeAmt: beforeTotal, afterAmt, price: null, meta: { source: source || 'service', merged: variantPositions.map(v=>v.id) }, source: source || 'service' }));
      return { ok: true, data: { id: updated.id, assetId: canonicalId, amount: afterAmt }, writes: [{ id: updated.id, assetId: canonicalId, symbol: chain, beforeAmt: beforeTotal, afterAmt, delta }] };
    }

    if (variantPositions.length === 1) {
      const existing = variantPositions[0];
      const beforeAmt = existing.amount.toNumber();
      const afterAmt = toFixedQty(targetAmount);
      const delta = afterAmt - beforeAmt;
      const updated = await prisma.position.update({ where: { id: existing.id }, data: { asset: canonicalId, chain, amount: new Prisma.Decimal(afterAmt) } });
      try {
        const cgId = await resolveAssetId({ assetId: existing.asset, symbol: chain });
        if (cgId && cgId !== updated.asset) {
          await prisma.position.update({ where: { id: updated.id }, data: { asset: cgId } });
          console.log('[backfill] position', updated.id, '->', cgId);
        }
      } catch {}
      if (existing.asset !== canonicalId) console.log('merge variants', { canonicalId, merged: [existing.id] });
      console.log('txn', { action: 'update_quantity', assetId: canonicalId, delta, beforeAmt, afterAmt });
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'update_quantity', symbolInput: chain, assetId: canonicalId, delta, beforeAmt, afterAmt, price: null, meta: {}, source: source || 'service' }));
      return { ok: true, data: { id: updated.id, assetId: canonicalId, amount: afterAmt }, writes: [{ id: updated.id, assetId: canonicalId, symbol: chain, beforeAmt, afterAmt, delta }] };
    }

    // No existing rows
    const created = await prisma.position.create({ data: { portfolioId: pf.id, asset: canonicalId, chain, amount: new Prisma.Decimal(targetAmount), source: source || 'service' } });
    console.log('txn', { action: 'update_quantity', assetId: canonicalId, delta: targetAmount, beforeAmt: 0, afterAmt: targetAmount });
    logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'update_quantity', symbolInput: chain, assetId: canonicalId, delta: targetAmount, beforeAmt: 0, afterAmt: targetAmount, price: null, meta: {}, source: source || 'service' }));
    return { ok: true, data: { id: created.id, assetId: canonicalId, amount: targetAmount }, writes: [{ id: created.id, assetId: canonicalId, symbol: chain, beforeAmt: 0, afterAmt: targetAmount, delta: targetAmount }] };
  } catch (e:any) { return { ok: false, error: e?.message || 'set_failed' }; }
}

export async function removePosition(userId: string, assetIdRaw: string, source?: string): Promise<OpResult<{ removedId: string }>> {
  try {
    const pf = await getPortfolioAndPositions(userId);
    const rawSymbol = assetIdRaw || '';
    const canonicalId = normalizeAsset(rawSymbol);
    const variants = Array.from(new Set([canonicalId, rawSymbol, rawSymbol.toUpperCase(), rawSymbol.toLowerCase()].filter(Boolean)));
    const variantPositions = await prisma.position.findMany({ where: { portfolioId: pf.id, asset: { in: variants } } });
    if (!variantPositions.length) return { ok: true, data: { removedId: '' }, writes: [] };
    const beforeTotal = variantPositions.reduce((s,p)=> s + p.amount.toNumber(), 0);
    const ids = variantPositions.map(p=>p.id);
    await prisma.position.deleteMany({ where: { id: { in: ids } } });
    if (variantPositions.length > 1) console.log('merge variants', { canonicalId, merged: ids, removed: true });
    console.log('txn', { action: 'remove_position', assetId: canonicalId, delta: -beforeTotal, beforeAmt: beforeTotal, afterAmt: 0 });
    // Use first position's chain if exists
    const symbolInput = rawSymbol.toUpperCase();
    logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'remove_position', symbolInput, assetId: canonicalId, delta: -beforeTotal, beforeAmt: beforeTotal, afterAmt: 0, price: null, meta: { removedIds: ids }, source: source || 'service' }));
    return { ok: true, data: { removedId: ids[0] }, writes: [{ id: ids[0], assetId: canonicalId, symbol: symbolInput, beforeAmt: beforeTotal, afterAmt: 0, delta: -beforeTotal }] };
  } catch (e:any) { return { ok: false, error: e?.message || 'remove_failed' }; }
}

export async function sellPercent(userId: string, assetIdRaw: string, percent: number, source: string = 'chat'): Promise<OpResult<{ id: string; assetId: string; amount: number; writes: WriteLike[] }>> {
  try {
    const pf = await getPortfolioAndPositions(userId);
    const assetId = normalizeAsset(assetIdRaw);
    const pos = pf.positions.find(p => p.asset === assetId);
    if (!pos) {
      return { ok: true, data: { id: '', assetId, amount: 0, writes: [] }, writes: [] };
    }
    const beforeAmt = pos.amount.toNumber();
    const pct = clamp(percent, 0, 100);
    const delta = -beforeAmt * (pct/100);
    let afterAmt = beforeAmt + delta; // delta is negative
    if (afterAmt < 0) afterAmt = 0;
    afterAmt = toFixedQty(afterAmt);
    if (afterAmt !== beforeAmt) {
      await prisma.position.update({ where: { id: pos.id }, data: { amount: new Prisma.Decimal(afterAmt) } });
    }
    console.log('txn', { action: 'sell_percent', assetId, delta: afterAmt - beforeAmt, beforeAmt, afterAmt });
    try {
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'sell_percent', symbolInput: pos.chain || pos.asset.toUpperCase(), assetId, delta: afterAmt - beforeAmt, beforeAmt, afterAmt, price: null, meta: { percent: pct }, source }));
    } catch {}
    const writes: WriteLike[] = [{ id: pos.id, assetId, symbol: pos.chain || pos.asset.toUpperCase(), beforeAmt, afterAmt, delta: afterAmt - beforeAmt }];
    return { ok: true, data: { id: pos.id, assetId, amount: afterAmt, writes }, writes };
  } catch (e:any) { return { ok: false, error: e?.message || 'sell_failed' }; }
}

export async function rebalancePortfolio(userId: string, target: 'equal_weight' | string = 'equal_weight', options: { tolerance?: number } = {}, source: string = 'chat'): Promise<OpResult<{ writes: WriteLike[]; reply: string }>> {
  try {
    if (target !== 'equal_weight') return { ok: true, data: { writes: [], reply: 'Target inconnue.' }, writes: [] };
    const pf = await getPortfolioAndPositions(userId);
    if (!pf.positions.length) return { ok: true, data: { writes: [], reply: 'Portefeuille vide.' }, writes: [] };
    const assets = pf.positions.map(p => p.asset);
    const priceMap = await resolvePriceMap(assets);
    const enriched = pf.positions.map(p => ({ p, price: priceMap[p.asset] }));
    const valid = enriched.filter(e => typeof e.price === 'number' && e.price!>0 && e.p.amount.toNumber() > 0);
    if (!valid.length) return { ok: true, data: { writes: [], reply: 'Aucun prix disponible.' }, writes: [] };
    const total = valid.reduce((s,e)=> s + e.p.amount.toNumber()* (e.price || 0), 0);
    if (!total) return { ok: true, data: { writes: [], reply: 'Valeur totale nulle.' }, writes: [] };
    const N = valid.length;
    const targetValue = total / N;
    const tol = options.tolerance ?? 0.01; // relative tolerance
    const writes: WriteLike[] = [];
    for (const { p, price } of valid) {
      if (!price) continue;
      const beforeAmt = p.amount.toNumber();
      const targetQty = targetValue / price;
      if (targetQty <= 0) continue;
      const relDiff = Math.abs(beforeAmt - targetQty) / targetQty;
      if (relDiff <= tol) continue;
      const afterAmt = toFixedQty(targetQty);
      await prisma.position.update({ where: { id: p.id }, data: { amount: new Prisma.Decimal(afterAmt) } });
      const delta = afterAmt - beforeAmt;
      writes.push({ id: p.id, assetId: p.asset, symbol: p.chain || p.asset.toUpperCase(), beforeAmt, afterAmt, delta });
      console.log('txn', { action: 'rebalance', assetId: p.asset, delta, beforeAmt, afterAmt });
      try { logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'rebalance', symbolInput: p.chain || p.asset.toUpperCase(), assetId: p.asset, delta, beforeAmt, afterAmt, price, meta: { target: 'equal_weight' }, source })); } catch {}
    }
    return { ok: true, data: { writes, reply: `Rééquilibrage appliqué (${writes.length} modifiées).` }, writes };
  } catch (e:any) { return { ok: false, error: e?.message || 'rebalance_failed' }; }
}

export async function diversifyPortfolio(userId: string, opts: { minPositions?: number; maxConcentration?: number } = {}, source: string = 'chat'): Promise<OpResult<{ writes: WriteLike[]; reply: string }>> {
  try {
    const pf = await getPortfolioAndPositions(userId);
    const minPositions = opts.minPositions ?? 5;
    const maxConcentration = opts.maxConcentration ?? 0.5;
    if (!pf.positions.length) return { ok: true, data: { writes: [], reply: 'Portefeuille vide.' }, writes: [] };
    const assets = pf.positions.map(p => p.asset);
    const priceMap = await resolvePriceMap(assets.concat(['bitcoin','ethereum','usd-coin']));
    // Compute value weights (skip positions without price)
    const priced = pf.positions.map(p => ({ p, price: priceMap[p.asset] })).filter(o => typeof o.price === 'number' && o.price!>0);
    const total = priced.reduce((s,o)=> s + o.p.amount.toNumber()* (o.price || 0), 0);
    if (!total) return { ok: true, data: { writes: [], reply: 'Valeur totale nulle.' }, writes: [] };
    const weights = priced.map(o => ({ p: o.p, price: o.price!, value: o.p.amount.toNumber()*o.price!, w: (o.p.amount.toNumber()*o.price!)/total }));
    weights.sort((a,b)=> b.w - a.w);
    const dominant = weights[0];
    const writes: WriteLike[] = [];
    if (dominant && dominant.w > maxConcentration) {
      const targetValue = total * maxConcentration;
      const targetQty = targetValue / dominant.price;
      const beforeAmt = dominant.p.amount.toNumber();
      const afterAmt = toFixedQty(targetQty);
      if (afterAmt < beforeAmt) {
        await prisma.position.update({ where: { id: dominant.p.id }, data: { amount: new Prisma.Decimal(afterAmt) } });
        const delta = afterAmt - beforeAmt;
        writes.push({ id: dominant.p.id, assetId: dominant.p.asset, symbol: dominant.p.chain || dominant.p.asset.toUpperCase(), beforeAmt, afterAmt, delta });
        console.log('txn', { action: 'diversify', assetId: dominant.p.asset, delta, beforeAmt, afterAmt });
        try { logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'diversify', symbolInput: dominant.p.chain || dominant.p.asset.toUpperCase(), assetId: dominant.p.asset, delta, beforeAmt, afterAmt, price: dominant.price, meta: { phase: 'trim', maxConcentration }, source })); } catch {}
      }
    }
    // Add core assets to reach minPositions
    const coreIds = ['bitcoin','ethereum','usd-coin'];
    const existingSet = new Set(pf.positions.map(p => p.asset));
    for (const cid of coreIds) {
      if (pf.positions.length + writes.length >= minPositions) break;
      if (!existingSet.has(cid)) {
        const price = priceMap[cid];
        if (!price) continue; // skip if no price
        const pfRefetch = await prisma.portfolio.findFirst({ where: { userId }, include: { positions: true } });
        const addQty = toFixedQty((total / minPositions) / price * 0.2); // small starter (20% of equal weight)
        const created = await prisma.position.create({ data: { portfolioId: pfRefetch!.id, asset: cid, chain: (TOKENS.find(t=>t.id===cid)?.symbol || cid).toUpperCase(), amount: new Prisma.Decimal(addQty), source } });
        writes.push({ id: created.id, assetId: cid, symbol: (TOKENS.find(t=>t.id===cid)?.symbol || cid).toUpperCase(), beforeAmt: 0, afterAmt: addQty, delta: addQty });
        console.log('txn', { action: 'diversify', assetId: cid, delta: addQty, beforeAmt: 0, afterAmt: addQty });
        try { logTransactionBQ(buildTxnRow({ userId, portfolioId: pfRefetch!.id, action: 'diversify', symbolInput: (TOKENS.find(t=>t.id===cid)?.symbol || cid).toUpperCase(), assetId: cid, delta: addQty, beforeAmt: 0, afterAmt: addQty, price, meta: { phase: 'add_core', minPositions }, source })); } catch {}
      }
    }
    const reply = writes.length ? 'Diversification appliquée.' : 'Déjà diversifié.';
    return { ok: true, data: { writes, reply }, writes };
  } catch (e:any) { return { ok: false, error: e?.message || 'diversify_failed' }; }
}

export async function answerQuestion(userId: string, question: string): Promise<{ reply: string; meta?: any }> {
  try {
    const pf = await getPortfolioAndPositions(userId);
    if (!pf.positions.length) return { reply: 'Portefeuille vide.' };
    const q = question || '';
    const assetIds = pf.positions.map(p => p.asset);
    const priceMap = await resolvePriceMap(assetIds);
    const rows = pf.positions.map(p => {
      const price = priceMap[p.asset];
      const qty = p.amount.toNumber();
      const value = price ? qty * price : 0;
      const symbol = p.chain || (TOKENS.find(t=>t.id===p.asset)?.symbol || p.asset).toUpperCase();
      return { assetId: p.asset, symbol, qty, price, value };
    });
    const totalValue = rows.reduce((s,r)=> s + r.value, 0);
    const fallbackTotalQty = rows.reduce((s,r)=> s + r.qty, 0) || 1;
    // Compute weights (prefer value if available)
    const weights = rows.map(r => ({
      assetId: r.assetId,
      symbol: r.symbol,
      weight: totalValue > 0 ? (r.value/totalValue) : (r.qty / fallbackTotalQty),
      value: r.value,
      qty: r.qty
    }));
    const sorted = weights.slice().sort((a,b)=> b.weight - a.weight);
    const largest = sorted[0];

    // Intent: valeur totale
    if (/valeur.*totale/i.test(q)) {
      if (totalValue > 0) return { reply: `${totalValue.toFixed(2)} USD` , meta: { totalValue } };
      return { reply: 'Valeur indisponible (prix manquants).', meta: { totalValue } };
    }

    // Intent: poids d'un actif spécifique
    const poidsMatch = q.match(/poids.*([A-Z0-9-]+)/i);
    if (poidsMatch) {
      const raw = poidsMatch[1];
      const norm = normalizeAsset(raw);
      const w = weights.find(w => w.assetId === norm || w.symbol.toUpperCase() === raw.toUpperCase());
      if (w) {
        return { reply: `Poids ${w.symbol}: ${(w.weight*100).toFixed(2)}%` , meta: { assetId: w.assetId, weight: w.weight } };
      }
      return { reply: `Actif ${raw.toUpperCase()} introuvable.` };
    }

    // Intent: concentration / actif le plus lourd
    if (/(concentration|actif.*plus.*lourd)/i.test(q)) {
      if (largest) {
        return { reply: `Plus lourd: ${largest.symbol} ${(largest.weight*100).toFixed(2)}%` , meta: { assetId: largest.assetId, weight: largest.weight } };
      }
      return { reply: 'Aucune position valorisable.' };
    }

    // Intent: nombre de positions
    if (/(combien|nombre).*positions/i.test(q)) {
      return { reply: `${pf.positions.length} positions` , meta: { count: pf.positions.length } };
    }

    return { reply: 'Question non comprise.' };
  } catch (e:any) {
    return { reply: 'Erreur analyse.' };
  }
}

// Export helpers (if needed externally)
export const helpers = { getPortfolioAndPositions, resolvePriceMap, clamp, toFixedQty };
