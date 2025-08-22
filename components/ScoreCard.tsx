"use client";

interface ScoreSummary {
  nav: number;      // Net Asset Value
  risk: string;     // e.g. "faible", "modéré", "élevé"
  score: number;    // 0-100
}

interface Props { summary: ScoreSummary }

export default function ScoreCard({ summary }: Props) {
  const { nav, risk, score } = summary;

  // Couleur badge selon risque
  const riskClass =
    risk.toLowerCase().includes("élev") || risk.toLowerCase().includes("eleve")
      ? "bg-red-100 text-red-700"
      : risk.toLowerCase().includes("mod")
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 flex flex-col gap-3 max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-800">Score global</h3>
        <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${riskClass}`}>{risk}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums text-neutral-900">{score}</span>
        <span className="text-neutral-400 mb-1 text-sm">/100</span>
      </div>
      <div className="text-[12px] text-neutral-600">
        Valeur portefeuille&nbsp;: <span className="font-medium">{nav.toLocaleString(undefined,{ maximumFractionDigits:2 })} $</span>
      </div>
    </div>
  );
}
