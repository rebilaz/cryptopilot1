"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import WatchCard from "@/components/ui/WatchCard";
import { mockSignals } from "@/lib/mocks";
import { computeSynthetic } from "@/lib/risk";
import { motion, useReducedMotion } from "framer-motion";

// Couleurs label
const labelStyles: Record<ReturnType<typeof computeSynthetic>['label'], string> = {
  Faible: "text-emerald-300 bg-emerald-400/10",
  Modéré: "text-amber-200 bg-amber-400/10",
  Élevé: "text-rose-200 bg-rose-400/10",
};

export function RiskSynthetic() {
  const prefersReduced = useReducedMotion();
  // Agrégation des signaux (opportunités + risques) – parti pris: tout reflète une dynamique à surveiller.
  const allSignals = useMemo(() => [...mockSignals.opportunities, ...mockSignals.risks], []);
  const base = useMemo(() => computeSynthetic(allSignals), [allSignals]);

  // Delta persistant (session précédente)
  const [delta, setDelta] = useState<number | undefined>();
  const first = useRef(true);
  useEffect(() => {
    try {
      const key = 'cp_risk_synthetic';
      const stored = localStorage.getItem(key);
      if (stored) {
        const prev = JSON.parse(stored) as { value: number; ts: number };
        setDelta(base.value - prev.value);
      }
      // Sauvegarde valeur courante
      localStorage.setItem(key, JSON.stringify({ value: base.value, ts: Date.now() }));
    } catch {
      /* stockage non critique */
    }
    first.current = false;
  }, [base.value]);

  // Anneau SVG (simple, léger)
  const radius = 42; // px
  const circumference = 2 * Math.PI * radius;
  const progress = (base.value / 100) * circumference;

  return (
    <WatchCard
      title="Risque Synthétique"
      subtitle="Combinaison des signaux"
      ariaDescription={base.explanation}
      icon={<span aria-hidden>⚠️</span>}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-5">
        <div className="relative" aria-live="polite">
          <svg width={110} height={110} className="block">
            <circle
              cx={55}
              cy={55}
              r={radius}
              stroke="currentColor"
              className="text-white/10"
              strokeWidth={8}
              fill="none"
            />
            {!prefersReduced && (
              <motion.circle
                cx={55}
                cy={55}
                r={radius}
                stroke="url(#gradRisk)"
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                style={{ strokeDasharray: `${circumference} ${circumference}` }}
              />
            )}
            {prefersReduced && (
              <circle
                cx={55}
                cy={55}
                r={radius}
                stroke="url(#gradRisk)"
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={circumference - progress}
              />
            )}
            <defs>
              <linearGradient id="gradRisk" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="70%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-white text-sm font-semibold">
              {base.value}
            </text>
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className={"px-2 py-1 rounded-md text-[11px] font-semibold " + labelStyles[base.label]}>{base.label}</span>
            {typeof delta === 'number' && delta !== 0 && (
              <span className={`text-[11px] font-medium ${delta > 0 ? 'text-rose-300' : 'text-emerald-300'}`}
                aria-label={delta > 0 ? `Hausse de ${delta} points vs session précédente` : `Baisse de ${Math.abs(delta)} points vs session précédente`}>
                {delta > 0 ? '▲ +' + delta : '▼ ' + delta}
              </span>
            )}
          </div>
          <p className="text-xs text-white/65 leading-relaxed max-w-sm" id="risk-expl">
            {base.explanation}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-white/40">Aggrégation pédagogique – pas un conseil.</p>
        </div>
      </div>
    </WatchCard>
  );
}

export default RiskSynthetic;
