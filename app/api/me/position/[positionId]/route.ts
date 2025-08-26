import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function sanitizeAmount(val: any): number | null { const n = Number(val); if (!isFinite(n) || n < 0) return null; return parseFloat(n.toFixed(8)); }

export async function PATCH(_req: Request, { params }: { params: { positionId: string } }) {
  const t0 = Date.now();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any; try { body = await _req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const amount = body.amount !== undefined ? sanitizeAmount(body.amount) : undefined;
  const symbol = body.symbol ? String(body.symbol).toUpperCase() : undefined;
  const name = body.name ? String(body.name) : undefined;
  const pos = await prisma.position.findUnique({ where: { id: params.positionId }, include: { portfolio: true } });
  if (!pos || pos.portfolio?.userId !== userId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const data: any = {};
  if (amount !== undefined) { if (amount === null) return NextResponse.json({ error: 'invalid_amount' }, { status: 400 }); data.amount = amount; }
  if (symbol) data.chain = symbol;
  if (name) data.source = name;
  const updated = await prisma.position.update({ where: { id: pos.id }, data });
  if (process.env.NODE_ENV !== 'production') console.debug('api.me.position.PATCH', { userId, ms: Date.now()-t0 });
  return NextResponse.json({ id: updated.id, assetId: updated.asset, symbol: updated.chain, name: updated.source, amount: Number(updated.amount) });
}

export async function DELETE(_req: Request, { params }: { params: { positionId: string } }) {
  const t0 = Date.now();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json(null, { status: 401 });
  const pos = await prisma.position.findUnique({ where: { id: params.positionId }, include: { portfolio: true } });
  if (!pos || pos.portfolio?.userId !== userId) return NextResponse.json(null, { status: 404 });
  await prisma.position.delete({ where: { id: pos.id } });
  if (process.env.NODE_ENV !== 'production') console.debug('api.me.position.DELETE', { userId, ms: Date.now()-t0 });
  return new NextResponse(null, { status: 204 });
}
