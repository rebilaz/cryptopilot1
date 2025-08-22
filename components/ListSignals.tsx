"use client";
import { getTopSignals, ScoredSignal } from "@/lib/mocks";
import WatchCard from "@/components/ui/WatchCard";
import { useReducedMotion } from "framer-motion";

// Props: si items non fournis on fallback sur mocks centraux
interface SignalListProps {
  title: string;
  variant?: 'positive' | 'negative';
  items?: ScoredSignal[]; // optionnel pour réutilisation future (ex: filtres dynamiques)
  limit?: number;         // possibilité de limiter (par défaut 5)
}

export function ListSignals({ title, variant='positive', items, limit=5 }: SignalListProps) {
  const prefersReduced = useReducedMotion();
  const color = variant === 'positive' ? 'text-emerald-300' : 'text-rose-300';
  const bullet = variant === 'positive' ? 'bg-emerald-400' : 'bg-rose-400';
  const data = items ?? getTopSignals(variant === 'positive' ? 'opportunities' : 'risks', limit);

  return (
  <WatchCard title={title} subtitle={variant === 'positive' ? 'Top 5' : 'Top 5'} ariaDescription={`Liste ${title.toLowerCase()} classées par score`} className={prefersReduced ? '' : ''}>
      <ul className="space-y-2">
        {data.map((it)=>(
          <li key={it.id} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${bullet}`} />
              {it.label}
            </span>
            <span className={`font-medium tabular-nums ${color}`}>{it.score}</span>
          </li>
        ))}
      </ul>
    </WatchCard>
  );
}
