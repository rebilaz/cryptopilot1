import { NextResponse } from 'next/server';
import { getPrices } from '@/lib/prices/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/prices?ids=bitcoin,ethereum,solana&vs=usd
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean);
  const vs = searchParams.get('vs') || 'usd';
  try {
    const data = await getPrices(ids, vs);
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=30' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
