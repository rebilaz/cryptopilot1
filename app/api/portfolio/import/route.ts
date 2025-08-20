import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBalances } from "@/lib/portfolio/adapters/etherscanLike";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const Schema = z.object({
  addresses: z.array(z.object({ chain: z.string(), address: z.string() })),
  includeTokens: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const all = [] as any[];
    for (const a of body.addresses) {
      const positions = await fetchBalances(a, body.includeTokens);
      all.push(...positions);
    }
    const map = new Map<string, any>();
    for (const p of all) {
      const prev = map.get(p.asset);
      map.set(p.asset, { ...p, amount: (prev?.amount || 0) + p.amount });
    }
    return NextResponse.json({ positions: Array.from(map.values()) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
