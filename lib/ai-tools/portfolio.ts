import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { TOKENS } from '@/lib/prices/tokens';
import { normalizeAsset } from '@/lib/prices/normalizeAsset';
import { buildTxnRow, logTransactionBQ } from '@/lib/bq';

export type ToolResult<T = any> = { ok: true; data: T } | { ok: false; error: string };

function err(error: string): ToolResult<any> { return { ok: false, error }; }
function ok<T>(data: T): ToolResult<T> { return { ok: true, data }; }

// Validate & normalize amount
function parseAmount(raw: any): number {
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) throw new Error('invalid_amount');
  return v;
}

// Retrieve or create the portfolio for a user
async function getOrCreatePortfolio(userId: string) {
  let pf = await prisma.portfolio.findFirst({ where: { userId }, include: { positions: true } });
  if (!pf) {
    pf = await prisma.portfolio.create({ data: { userId, label: 'Mon portefeuille', positions: [] as any }, include: { positions: true } });
  }
  return pf;
}

// Backwards compatibility internal usage
const ensurePortfolio = getOrCreatePortfolio;

export async function getPortfolio(userId: string): Promise<ToolResult<{ positions: Array<{ id: string; symbol: string; name?: string; amount: number }> }>> {
  if (!userId) return err('unauthorized');
  try {
  const pf = await getOrCreatePortfolio(userId);
    const list = pf.positions
      .map(p => ({ id: p.id, symbol: p.asset.toUpperCase(), name: p.asset.toUpperCase(), amount: Number(p.amount) }))
      .sort((a,b)=>a.symbol.localeCompare(b.symbol));
    return ok({ positions: list });
  } catch (e: any) {
    return err('db_error');
  }
}

export async function addPosition(userId: string, input: { symbol: string; name?: string; amount: any }): Promise<ToolResult<{ id: string; symbol: string; amount: number }>> {
  if (!userId) return err('unauthorized');
  const symbol = (input.symbol||'').trim().toUpperCase();
  if (!symbol) return err('invalid_symbol');
  let amount: number;
  try { amount = parseAmount(input.amount); } catch { return err('invalid_amount'); }
  try {
    const pf = await getOrCreatePortfolio(userId);
    // Map symbol -> Coingecko id if known
  const assetKey = normalizeAsset(symbol);
    // Try to find existing position using any prior stored variant (legacy uppercase symbol or new id)
    const existing = await prisma.position.findFirst({
      where: {
        portfolioId: pf.id,
        asset: { in: [assetKey, symbol, symbol.toLowerCase()] }
      }
    });
    if (existing) {
      const beforeAmt = existing.amount.toNumber();
      const afterAmt = beforeAmt + amount;
      const updated = await prisma.position.update({
        where: { id: existing.id },
        data: {
          amount: new Prisma.Decimal(afterAmt),
          ...(existing.asset !== assetKey ? { asset: assetKey, chain: symbol } : {})
        }
      });
      console.log('txn', { action: 'add_position', assetId: assetKey, delta: amount, beforeAmt, afterAmt });
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'add_position', symbolInput: symbol, assetId: assetKey, delta: amount, beforeAmt, afterAmt, price: null, meta: { source: input.name || 'ai-tool' }, source: 'api' }));
      return ok({ id: updated.id, symbol, amount: updated.amount.toNumber() });
    }
    const created = await prisma.position.create({ data: { portfolioId: pf.id, chain: symbol, asset: assetKey, amount: new Prisma.Decimal(amount), source: input.name || 'ai-tool' } });
    console.log('txn', { action: 'add_position', assetId: assetKey, delta: amount, beforeAmt: 0, afterAmt: amount });
    logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'add_position', symbolInput: symbol, assetId: assetKey, delta: amount, beforeAmt: 0, afterAmt: amount, price: null, meta: { source: input.name || 'ai-tool' }, source: 'api' }));
    return ok({ id: created.id, symbol, amount: created.amount.toNumber() });
  } catch (e: any) {
    return err('db_error');
  }
}

export async function setQuantity(userId: string, input: { symbol: string; amount: any }): Promise<ToolResult<{ id: string; symbol: string; amount: number }>> {
  if (!userId) return err('unauthorized');
  const symbol = (input.symbol||'').trim().toUpperCase();
  if (!symbol) return err('invalid_symbol');
  let amount: number;
  try { amount = parseAmount(input.amount); } catch { return err('invalid_amount'); }
  try {
    const pf = await getOrCreatePortfolio(userId);
  const assetKey = normalizeAsset(symbol);
    const existing = await prisma.position.findFirst({
      where: {
        portfolioId: pf.id,
        asset: { in: [assetKey, symbol, symbol.toLowerCase()] }
      }
    });
    if (!existing) {
      const created = await prisma.position.create({ data: { portfolioId: pf.id, chain: symbol, asset: assetKey, amount: new Prisma.Decimal(amount), source: 'ai-tool' } });
      console.log('txn', { action: 'update_quantity', assetId: assetKey, delta: amount, beforeAmt: 0, afterAmt: amount });
      logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'update_quantity', symbolInput: symbol, assetId: assetKey, delta: amount, beforeAmt: 0, afterAmt: amount, price: null, meta: {}, source: 'api' }));
      return ok({ id: created.id, symbol, amount: created.amount.toNumber() });
    }
    const beforeAmt = existing.amount.toNumber();
    const delta = amount - beforeAmt;
    const updated = await prisma.position.update({
      where: { id: existing.id },
      data: {
        amount: new Prisma.Decimal(amount),
        ...(existing.asset !== assetKey ? { asset: assetKey, chain: symbol } : {})
      }
    });
    console.log('txn', { action: 'update_quantity', assetId: assetKey, delta, beforeAmt, afterAmt: amount });
    logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'update_quantity', symbolInput: symbol, assetId: assetKey, delta, beforeAmt, afterAmt: amount, price: null, meta: {}, source: 'api' }));
    return ok({ id: updated.id, symbol, amount: updated.amount.toNumber() });
  } catch (e: any) {
    return err('db_error');
  }
}

export async function removePosition(userId: string, input: { symbol: string }): Promise<ToolResult<{ removedId: string }>> {
  if (!userId) return err('unauthorized');
  const symbol = (input.symbol||'').trim().toUpperCase();
  if (!symbol) return err('invalid_symbol');
  try {
    const pf = await getOrCreatePortfolio(userId);
  const assetKey = normalizeAsset(symbol);
  const existing = await prisma.position.findFirst({ where: { portfolioId: pf.id, asset: assetKey } });
  if (!existing) return ok({ removedId: '' });
  const beforeAmt = existing.amount.toNumber();
  await prisma.position.delete({ where: { id: existing.id } });
  console.log('txn', { action: 'remove_position', assetId: assetKey, delta: -beforeAmt, beforeAmt, afterAmt: 0 });
  logTransactionBQ(buildTxnRow({ userId, portfolioId: pf.id, action: 'remove_position', symbolInput: symbol, assetId: assetKey, delta: -beforeAmt, beforeAmt, afterAmt: 0, price: null, meta: {}, source: 'api' }));
  return ok({ removedId: existing.id });
  } catch (e: any) {
    return err('db_error');
  }
}
