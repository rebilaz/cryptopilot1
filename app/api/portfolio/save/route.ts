import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSimplePrices } from "@/lib/prices/coingecko";

export const runtime = "nodejs";

const BodySchema = z.object({
  label: z.string().default("Mon portefeuille"),
  positions: z.array(
    z.object({ asset: z.string(), amount: z.number(), chain: z.string().optional() })
  ),
  vsCurrency: z.string().default("usd"),
});

const ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = BodySchema.parse(await req.json());
    const portfolio = await prisma.portfolio.create({
      data: {
        label: body.label,
        user: { connect: { email: session.user.email } },
        positions: {
          create: body.positions.map((p) => ({
            chain: p.chain || "manual",
            asset: p.asset,
            amount: p.amount,
            source: "manual",
          })),
        },
      },
    });

    const ids = body.positions.map((p) => ID_MAP[p.asset] || p.asset.toLowerCase());
    const prices = await fetchSimplePrices(ids, body.vsCurrency);
    const nav = body.positions.reduce(
      (acc, p, i) => acc + p.amount * (prices[ids[i]]?.[body.vsCurrency] || 0),
      0
    );

    await prisma.snapshot.create({
      data: {
        portfolioId: portfolio.id,
        nav,
        vsCurrency: body.vsCurrency.toUpperCase(),
      },
    });

    return NextResponse.json({ portfolioId: portfolio.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
