import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchSimplePrices, fetchMarketChart } from "@/lib/prices/coingecko";
import {
  ruleBasedInsights,
  score,
  riskLevel,
  generateAiComment,
} from "@/lib/portfolio/analysisEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BodySchema = z.object({
  positions: z.array(
    z.object({ asset: z.string(), amount: z.number() })
  ),
  vsCurrency: z.string().default("usd"),
  window: z.enum(["24h", "7d", "30d", "365d"]).default("7d"),
});

const ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
};

const WINDOW_DAYS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "365d": 365,
};

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const ids = body.positions.map((p) => ID_MAP[p.asset] || p.asset.toLowerCase());
    const prices = await fetchSimplePrices(ids, body.vsCurrency);
    const charts = await Promise.all(
      ids.map((id) => fetchMarketChart(id, body.vsCurrency, WINDOW_DAYS[body.window]))
    );

    const lastValues: Record<string, number> = {};
    ids.forEach((id) => {
      lastValues[id] = prices[id]?.[body.vsCurrency] || 0;
    });

    const weights = body.positions.map((p, i) => {
      const val = p.amount * lastValues[ids[i]];
      return { asset: p.asset, value: val };
    });
    const nav = weights.reduce((acc, w) => acc + w.value, 0);
    const weightEntries = weights.map((w) => ({ asset: w.asset, weight: w.value / nav }));

    // Build NAV series
    const series: { timestamp: number; nav: number }[] = [];
    const length = charts[0]?.length || 0;
    for (let i = 0; i < length; i++) {
      const timestamp = charts[0][i][0];
      let total = 0;
      for (let j = 0; j < charts.length; j++) {
        const price = charts[j][i][1];
        total += price * body.positions[j].amount;
      }
      series.push({ timestamp, nav: total });
    }

    const perfPct = series.length
      ? series[series.length - 1].nav / series[0].nav - 1
      : 0;

    const perf = { window: body.window, pct: perfPct };
    const risk = riskLevel(weightEntries);
    const sc = score(weightEntries, perf);
    const summary = { nav, risk, score: sc };
    const insights = ruleBasedInsights(weightEntries, perf);
    const aiComment = await generateAiComment(summary, weightEntries, perf);

    return NextResponse.json({
      summary,
      weights: weightEntries,
      perf,
      insights,
      chart: {
        timestamps: series.map((s) => s.timestamp),
        navSeries: series.map((s) => s.nav),
      },
      aiComment,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
