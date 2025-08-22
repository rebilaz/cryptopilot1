"use client";
import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import WatchCard from "@/components/ui/WatchCard";

const sentiments = [
  { label: "Bullish", emoji: "🟢", color: "from-emerald-400/30 to-emerald-500/10" },
  { label: "Neutre", emoji: "🟡", color: "from-amber-300/30 to-amber-400/10" },
  { label: "Bearish", emoji: "🔴", color: "from-rose-400/30 to-rose-500/10" },
];

export function MarketStatus() {
  const prefersReduced = useReducedMotion();
  const index = new Date().getHours() % sentiments.length;
  const current = useMemo(() => sentiments[index], [index]);
  return (
    <WatchCard
      title="Marché global"
      subtitle={current.label}
      icon={<span aria-hidden>{current.emoji}</span>}
      ariaDescription="Lecture synthétique basée sur volatilité, momentum et flux agrégés (placeholder)."
      className={"bg-gradient-to-br " + (prefersReduced ? "" : "animate-none")}
    >
      <p className="text-xs text-white/65 leading-relaxed max-w-sm">
        Lecture synthétique (volatilité, momentum, flux). Support d'éducation – aucune recommandation.
      </p>
    </WatchCard>
  );
}
