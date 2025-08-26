import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { evaluate, processTransactions } from '@/lib/ledger/costBasis';
import { normalizeAsset } from '@/lib/prices/normalizeAsset';

const createSchema = z.object({
  type: z.enum(['BUY','SELL','DEPOSIT','WITHDRAW','FEE','ADJUST']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  note: z.string().max(280).optional()
});

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  const session: any = await getServerSession(authOptions as any);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ ok: false, error: 'unauthenticated' }), { status: 401 });
  const assetIdRaw = params.assetId;
  const assetId = normalizeAsset(assetIdRaw);
  try {
    const portfolio = await prisma.portfolio.findFirst({ where: { userId } });
    if (!portfolio) return new Response(JSON.stringify({ ok: true, transactions: [], aggregates: null }), { status: 200 });
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit')||'200',10)||200, 500);
  const txns = await (prisma as any).transaction.findMany({ where: { portfolioId: portfolio.id, assetId }, orderBy: { createdAt: 'asc' }, take: limit });
  const mapped = txns.map((t: any) => ({ id: t.id, assetId: t.assetId, type: t.type, quantity: Number(t.quantity), price: t.price ? Number(t.price) : undefined, createdAt: t.createdAt }));
    const costState = processTransactions(assetId, mapped as any);
    return new Response(JSON.stringify({ ok: true, transactions: mapped, aggregates: costState }), { status: 200 });
  } catch (e:any) {
    console.warn('[txns.get.error]', e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  const session: any = await getServerSession(authOptions as any);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return new Response(JSON.stringify({ ok: false, error: 'unauthenticated' }), { status: 401 });
  const assetIdRaw = params.assetId;
  const assetId = normalizeAsset(assetIdRaw);
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ ok: false, error: 'validation', issues: parsed.error.flatten() }), { status: 400 });
    const portfolio = await prisma.portfolio.findFirst({ where: { userId } });
    if (!portfolio) return new Response(JSON.stringify({ ok: false, error: 'no_portfolio' }), { status: 400 });
    const data = parsed.data;
    const created = await (prisma as any).transaction.create({ data: { portfolioId: portfolio.id, assetId, type: data.type, quantity: data.quantity, price: data.price, note: data.note } });

    // Apply side-effect to Position table for live holdings
    try {
      const pos = await prisma.position.findFirst({ where: { portfolioId: portfolio.id, asset: assetId } });
      const qty = Number(data.quantity);
      const type = data.type;
      if (type === 'ADJUST') {
        // Set absolute quantity
        if (pos) {
          await prisma.position.update({ where: { id: pos.id }, data: { amount: qty } });
        } else {
          await prisma.position.create({ data: { portfolioId: portfolio.id, asset: assetId, chain: assetId.toUpperCase(), amount: qty, source: 'txn' } });
        }
      } else {
        // Delta based adjustments
        const sign = (type === 'BUY' || type === 'DEPOSIT') ? 1 : (type === 'SELL' || type === 'WITHDRAW' || type === 'FEE') ? -1 : 0;
        if (sign !== 0) {
          if (pos) {
            let newAmt = Number(pos.amount) + sign * qty;
            if (newAmt < 0) newAmt = 0;
            await prisma.position.update({ where: { id: pos.id }, data: { amount: newAmt } });
          } else if (sign > 0) {
            await prisma.position.create({ data: { portfolioId: portfolio.id, asset: assetId, chain: assetId.toUpperCase(), amount: qty, source: 'txn' } });
          }
        }
      }
    } catch (adjErr) { console.warn('[txns.post.adjust_position.error]', adjErr); }
    return new Response(JSON.stringify({ ok: true, transaction: created }), { status: 201 });
  } catch (e:any) {
    console.warn('[txns.post.error]', e);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500 });
  }
}
