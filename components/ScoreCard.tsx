"use client";
import React from "react";

interface Summary {
  nav: number;
  risk: string;
  score: number;
}

export default function ScoreCard({ summary }: { summary: Summary }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">Score pédagogique</div>
      <div className="mt-1 text-3xl font-semibold">{summary.score}/100</div>
      <div className="mt-2 text-sm text-white/70">
        Risque: <span className="font-medium">{summary.risk}</span>
      </div>
      <div className="mt-2 text-sm text-white/70">
        Valeur totale: {summary.nav.toFixed(2)}
      </div>
    </div>
  );
}
