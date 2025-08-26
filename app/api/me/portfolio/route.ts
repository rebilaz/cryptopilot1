import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeAsset } from '@/lib/prices/normalizeAsset';
import { TOKENS } from '@/lib/prices/tokens';

export const runtime = 'nodejs';

function sanitizeAmount(val: any): number | null {
  const n = Number(val);
  if (!isFinite(n) || n < 0) return null;
  return parseFloat(n.toFixed(8));
}

export async function GET() {
  console.log('[api] /api/me/portfolio hit');
  const t0 = Date.now();
  let ok = false; let error: string | undefined; let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    userId = (session as any)?.user?.id;
    if (!userId) {
      error = 'unauthenticated';
      return NextResponse.json({ ok: false, error, portfolio: { id: null, positions: [] } }, { status: 200 });
    }
    let portfolio; try {
      portfolio = await prisma.portfolio.findFirst({ where: { userId }, include: { positions: true } });
    } catch (e: any) {
      console.error('[portfolio.get] prisma', e);
      error = 'server_error';
      return NextResponse.json({ ok: false, error, portfolio: { id: null, positions: [] } }, { status: 200 });
    }
    ok = true;
    let payload;
    if (!portfolio) {
      payload = { id: null, positions: [] as any[] };
    } else {
      // Agrégation par canonicalId
      const aggregate = new Map<string, { id: string; assetId: string; symbol: string; name: string | null; amount: number }>();
      for (const p of portfolio.positions) {
        const raw = p.asset || p.chain || '';
        const canonicalId = normalizeAsset(raw || p.chain || '');
        const amt = Number(p.amount);
        const existing = aggregate.get(canonicalId);
        const tokenMeta = TOKENS.find(t => t.id === canonicalId);
        const preferredSymbol = tokenMeta?.symbol?.toUpperCase() || (p.chain || canonicalId).toUpperCase();
        if (existing) {
          existing.amount += amt;
          existing.id = p.id; // keep last id
        } else {
          aggregate.set(canonicalId, { id: p.id, assetId: canonicalId, symbol: preferredSymbol, name: p.source || null, amount: amt });
        }
      }
      payload = { id: portfolio.id, positions: Array.from(aggregate.values()) };
    }
  return NextResponse.json({ ok: true, portfolio: payload }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } });
  } catch (e: any) {
    console.error('[portfolio.get]', e);
  return NextResponse.json({ ok: false, error: 'server_error', portfolio: { id: null, positions: [] } }, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } });
  } finally {
    if (process.env.NODE_ENV !== 'production') console.log('[portfolio.get] userId=', userId, 'ok=', ok, 'err=', error, 'ms=', Date.now()-t0);
  }
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ ok: false, error: 'unauthenticated', portfolio: { id: null, positions: [] } }, { status: 200 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const arr = Array.isArray(body?.positions) ? body.positions : [];
  if (!Array.isArray(arr)) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  let portfolio = await prisma.portfolio.findFirst({ where: { userId } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({ data: { userId } });
  }
  // Strategy: delete existing then recreate (simpler for now)
  await prisma.position.deleteMany({ where: { portfolioId: portfolio.id } });
  const toCreate = arr
    .map((r: any) => {
      const amount = sanitizeAmount(r.amount);
      if (amount === null) return null;
      const assetId = String(r.assetId || r.id || '').toLowerCase();
      const symbol = String(r.symbol || '').toUpperCase();
      if (!assetId || !symbol) return null;
      return { portfolioId: portfolio!.id, asset: assetId, chain: symbol, source: r.name || symbol, amount, /* other fields kept */ };
    })
    .filter(Boolean) as any[];
  if (toCreate.length) await prisma.position.createMany({ data: toCreate });
  const fresh = await prisma.portfolio.findUnique({ where: { id: portfolio.id }, include: { positions: true } });
  const resp = {
    id: fresh!.id,
    positions: fresh!.positions.map(p => {
      const chainSym = (p.chain || '').toUpperCase();
      const assetId = (p.asset || '').toLowerCase();
      const isPlaceholder = !chainSym || chainSym === 'N/A';
      const symbol = isPlaceholder ? (assetId ? assetId.toUpperCase() : chainSym || '') : chainSym;
      return { id: p.id, assetId, symbol, name: p.source || null, amount: Number(p.amount) };
    })
  };
  if (process.env.NODE_ENV !== 'production') console.debug('api.me.portfolio.POST', { userId, count: toCreate.length, ms: Date.now()-t0 });
  return NextResponse.json({ ok: true, portfolio: resp });
}
