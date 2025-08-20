"use client";
import { useState } from "react";
import ScoreCard from "@/components/ScoreCard";
import PortfolioChart from "@/components/PortfolioChart";

type Holding = { symbol: string; amount: number };

type AnalyzeResponse = {
  summary: { nav: number; risk: string; score: number };
  insights: string[];
  chart: { timestamps: number[]; navSeries: number[] };
};

export default function PortfolioDemo() {
  const [holdings, setHoldings] = useState<Holding[]>([
    { symbol: "BTC", amount: 0.05 },
    { symbol: "ETH", amount: 0.8 },
    { symbol: "USDT", amount: 500 },
  ]);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const updateHolding = (i: number, key: keyof Holding, value: string) => {
    const next = [...holdings];
    if (key === "amount") next[i][key] = Number(value) || 0;
    else next[i][key] = value.toUpperCase();
    setHoldings(next);
  };

  const addRow = () => setHoldings([...holdings, { symbol: "", amount: 0 }]);
  const removeRow = (i: number) => setHoldings(holdings.filter((_, idx) => idx !== i));

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: holdings.map((h) => ({ asset: h.symbol, amount: h.amount })),
          vsCurrency: "usd",
          window: "7d",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? result.chart.timestamps.map((t, i) => ({ timestamp: t, nav: result.chart.navSeries[i] }))
    : [];

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white">Démo — Analyse de portefeuille</h2>
      <p className="mt-2 text-sm text-white/70">
        Colle une adresse publique (à venir) ou saisis 2-3 lignes pour voir le type d’analyse éducative fournie.
      </p>

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
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-400/40 disabled:opacity-50"
        >
          {loading ? "Analyse..." : "Analyser"}
        </button>
        <span className="text-xs text-white/40">Éducatif uniquement · aucun conseil en investissement</span>
      </div>

      {result && (
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <ScoreCard summary={result.summary} />
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <div className="text-xs text-white/60">Insights</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-white/80">
              {result.insights.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {chartData.length > 0 && (
              <div className="mt-4">
                <PortfolioChart data={chartData} />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
