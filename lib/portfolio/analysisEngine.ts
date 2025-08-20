export interface Summary {
  nav: number;
  risk: string;
  score: number;
}

export interface Weight {
  asset: string;
  weight: number;
}

export interface Perf {
  window: string;
  pct: number;
}

export function ruleBasedInsights(
  weights: Weight[],
  perf: Perf
): string[] {
  const messages: string[] = [];
  const maxWeight = Math.max(...weights.map((w) => w.weight));
  const stables = weights
    .filter((w) => ["USDT", "USDC", "DAI"].includes(w.asset))
    .reduce((acc, w) => acc + w.weight, 0);
  const btcEth = weights
    .filter((w) => ["BTC", "ETH"].includes(w.asset))
    .reduce((acc, w) => acc + w.weight, 0);

  if (maxWeight > 0.6)
    messages.push("Portefeuille concentré sur un seul actif.");
  if (stables < 0.05)
    messages.push("Faible part de stablecoins comme coussin de volatilité.");
  if (btcEth < 0.4)
    messages.push("BTC et ETH représentent une faible allocation.");
  if (perf.pct < 0)
    messages.push("Performance négative sur la période.");
  return messages;
}

export function score(weights: Weight[], perf: Perf): number {
  let s = 100;
  const maxWeight = Math.max(...weights.map((w) => w.weight));
  const stables = weights
    .filter((w) => ["USDT", "USDC", "DAI"].includes(w.asset))
    .reduce((acc, w) => acc + w.weight, 0);
  const btcEth = weights
    .filter((w) => ["BTC", "ETH"].includes(w.asset))
    .reduce((acc, w) => acc + w.weight, 0);

  if (maxWeight > 0.6) s -= 15;
  if (stables < 0.05) s -= 6;
  if (btcEth < 0.4) s -= 6;
  if (perf.pct < 0) s -= 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function riskLevel(weights: Weight[]): string {
  const maxWeight = Math.max(...weights.map((w) => w.weight));
  if (maxWeight > 0.6) return "Élevé";
  if (maxWeight > 0.4) return "Modéré";
  return "Faible";
}

export async function generateAiComment(
  summary: Summary,
  weights: Weight[],
  perf: Perf
): Promise<string> {
  // Stub simple, prêt pour un provider externe
  return `Score ${summary.score} avec un risque ${summary.risk}. Performance ${(
    perf.pct * 100
  ).toFixed(2)}% sur ${perf.window}.`;
}
