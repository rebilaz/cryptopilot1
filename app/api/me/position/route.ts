import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function sanitizeAmount(val: any): number | null { const n = Number(val); if (!isFinite(n) || n < 0) return null; return parseFloat(n.toFixed(8)); }

export async function POST(req: Request) {
  const t0 = Date.now();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const amount = sanitizeAmount(body?.amount);
  const assetId = String(body?.assetId || '').toLowerCase();
  const symbol = String(body?.symbol || '').toUpperCase();
  const name = body?.name ? String(body.name) : symbol;
  if (amount === null || !assetId || !symbol) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  let portfolio = await prisma.portfolio.findFirst({ where: { userId } });
  if (!portfolio) portfolio = await prisma.portfolio.create({ data: { userId } });
  const position = await prisma.position.create({ data: { portfolioId: portfolio.id, asset: assetId, chain: symbol, source: name, amount } });
  if (process.env.NODE_ENV !== 'production') console.debug('api.me.position.POST', { userId, ms: Date.now()-t0 });
  return NextResponse.json({ id: position.id, assetId: position.asset, symbol: position.chain, name: position.source, amount: Number(position.amount) });
}
