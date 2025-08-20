"use client";
import { useState } from "react";

type Holding = { symbol: string; amount: number };

function mockAnalyze(holdings: Holding[]) {
  // Simplifié : pondérations fixes pour l’exemple
  const prices: Record<string, number> = { BTC: 60000, ETH: 3000, USDT: 1, SOL: 150, BNB: 550 };
  const total = holdings.reduce((acc, h) => acc + (prices[h.symbol?.toUpperCase()] ?? 0) * h.amount, 0);

  const weights = holdings.map(h => {
    const v = (prices[h.symbol?.toUpperCase()] ?? 0) * h.amount;
    return { ...h, value: v, weight: total ? v / total : 0 };
  });

  // Heuristiques éducatives
  const btcW = weights.find(w => w.symbol.toUpperCase() === "BTC")?.weight ?? 0;
  const ethW = weights.find(w => w.symbol.toUpperCase() === "ETH")?.weight ?? 0;
  const stablesW = weights
    .filter(w => ["USDT", "USDC", "DAI"].includes(w.symbol.toUpperCase()))
    .reduce((s, w) => s + w.weight, 0);

  const concentration =
    weights.length ? Math.max(...weights.map(w => w.weight)) : 0;

  const risk =
    concentration > 0.6 ? "Élevé" : concentration > 0.35 ? "Modéré" : "Modéré à Faible";

  // Score très simple (0-100)
  let score = 72;
  if (concentration > 0.6) score -= 15;
  if (stablesW < 0.05) score -= 6;
  if (btcW + ethW < 0.4) score -= 6;
  score = Math.max(20, Math.min(95, score));

  const insights: string[] = [];
  if (concentration > 0.5) insights.push("Portefeuille concentré : envisage une répartition plus équilibrée.");
  if (stablesW < 0.05) insights.push("Peu de stablecoins : coussin de liquidité faible en cas de volatilité.");
  if (btcW + ethW < 0.4) insights.push("Peu d'exposition BTC/ETH : cœur de marché sous-pondéré.");

  if (insights.length === 0) insights.push("Équilibre correct pour un profil long terme. Continue d’affiner selon tes objectifs.");

  return { total, weights, risk, score, insights };
}

export default function PortfolioDemo() {
  const [holdings, setHoldings] = useState<Holding[]>([
    { symbol: "BTC", amount: 0.05 },
    { symbol: "ETH", amount: 0.8 },
    { symbol: "USDT", amount: 500 },
  ]);
  const [result, setResult] = useState<ReturnType<typeof mockAnalyze> | null>(null);
  const [address, setAddress] = useState("");

  const updateHolding = (i: number, key: keyof Holding, value: string) => {
    const next = [...holdings];
    if (key === "amount") next[i][key] = Number(value) || 0;
    else next[i][key] = value.toUpperCase();
    setHoldings(next);
  };

  const addRow = () => setHoldings([...holdings, { symbol: "", amount: 0 }]);
  const removeRow = (i: number) => setHoldings(holdings.filter((_, idx) => idx !== i));

  const analyze = () => setResult(mockAnalyze(holdings));

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white">Démo — Analyse de portefeuille</h2>
      <p className="mt-2 text-sm text-white/70">
        Colle une adresse publique (à venir) ou saisis 2-3 lignes pour voir le type d’analyse éducative fournie.
      </p>

      {/* Adresse (placeholder) */}
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresse publique (ex: 0x...) — bientôt actif"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400/50"
        />
        <button
          disabled
          className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/60 cursor-not-allowed"
        >
          Importer
        </button>
      </div>

      {/* Tableau simple d’édition */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Actif</th>
              <th className="px-2 py-2 text-left font-medium">Montant</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr key={i} className="border-t border-white/10">
                <td className="px-2 py-2">
                  <input
                    value={h.symbol}
                    onChange={(e) => updateHolding(i, "symbol", e.target.value)}
                    placeholder="BTC"
                    className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400/40"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={h.amount}
                    onChange={(e) => updateHolding(i, "amount", e.target.value)}
                    placeholder="0.1"
                    className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400/40"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeRow(i)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3">
          <button onClick={addRow} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10">
            + Ajouter une ligne
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={analyze}
          className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-400/40"
        >
          Analyser
        </button>
        <span className="text-xs text-white/40">Éducatif uniquement · aucun conseil en investissement</span>
      </div>

      {/* Résultats */}
      {result && (
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">Score pédagogique</div>
            <div className="mt-1 text-3xl font-semibold">{result.score}/100</div>
            <div className="mt-2 text-sm text-white/70">Risque: <span className="font-medium">{result.risk}</span></div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <div className="text-xs text-white/60">Insights</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-white/80">
              {result.insights.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
