"use client";
import { useEffect, useState } from 'react';
import WatchCard from '@/components/ui/WatchCard';
import { getPrices, SimplePriceMap } from '@/lib/prices/provider';
import { useReducedMotion } from 'framer-motion';

interface PriceRow { id: string; label: string; }
const DEFAULT_IDS: PriceRow[] = [
  { id: 'bitcoin', label: 'BTC' },
  { id: 'ethereum', label: 'ETH' },
  { id: 'solana', label: 'SOL' },
];

/**
 * PriceTicker – widget mock/offline pour afficher quelques prix.
 * Basculera automatiquement vers API Coingecko quand une clé ou activation sera disponible.
 */
export function PriceTicker({ ids = DEFAULT_IDS }: { ids?: PriceRow[] }) {
  const [data, setData] = useState<SimplePriceMap>({});
  const [loading, setLoading] = useState(true);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const prices = await getPrices(ids.map(i => i.id));
        if (!cancelled) setData(prices);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60_000); // refresh 1 min
    return () => { cancelled = true; clearInterval(interval); };
  }, [ids]);

  return (
    <WatchCard
      title="Prix"
      subtitle="Mock dynamique"
      ariaDescription="Affichage simplifié de prix mock (auto API plus tard)."
      icon={<span aria-hidden>💲</span>}
    >
      {loading && <p className="text-xs text-white/50">Chargement…</p>}
      {!loading && (
        <ul className="text-xs space-y-2">
          {ids.map(row => {
            const p = data[row.id];
            if (!p) return <li key={row.id} className="opacity-50">{row.label}</li>;
            const pct = p.change24h ?? 0;
            const color = pct > 0 ? 'text-emerald-300' : pct < 0 ? 'text-rose-300' : 'text-white/70';
            return (
              <li key={row.id} className="flex items-center justify-between">
                <span className="font-medium">{row.label}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span>${p.usd.toFixed(2)}</span>
                  <span className={color} aria-label={`Variation 24h ${pct}%`}>
                    {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {!prefersReduced && (
        <div className="mt-3 text-[10px] uppercase tracking-wide text-white/35">Mock provider – futur live</div>
      )}
    </WatchCard>
  );
}

export default PriceTicker;
