"use client";
import { usePortfolio } from '@/lib/hooks/usePortfolio';
import { useState } from 'react';
import { WatchCard } from '@/components/ui/WatchCard';

const DEFAULTS = [
  { id: 'bitcoin', symbol: 'BTC', quantity: 0.1 },
  { id: 'ethereum', symbol: 'ETH', quantity: 1 },
  { id: 'solana', symbol: 'SOL', quantity: 5 }
];

export function PortfolioWidget() {
  const { positions, prices, totalValue, addPosition, updateQuantity, remove, refresh, loading } = usePortfolio(DEFAULTS);
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const s = symbol.trim().toUpperCase();
    const q = parseFloat(qty);
    if (!s || !q || q <= 0) { setError('Champ invalide'); return; }
    addPosition({ symbol: s, quantity: q, id: s.toLowerCase() });
    setSymbol(''); setQty('');
    refresh();
  }

  return (
  <WatchCard title="Portefeuille" ariaDescription="Positions et valorisation mise à jour périodiquement via batch prix." >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium">Valeur Totale</div>
          <div className="tabular-nums">{totalValue ? totalValue.toLocaleString(undefined,{maximumFractionDigits:2}) + ' $' : '—'}</div>
        </div>
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="text-white/60">
              <th className="text-left py-1">Actif</th>
              <th className="text-right py-1">Qté</th>
              <th className="text-right py-1">Prix</th>
              <th className="text-right py-1">Valeur</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {positions.map(p => {
              const pr = prices[p.id]?.usd || 0;
              return (
                <tr key={p.symbol} className="border-t border-white/10">
                  <td className="py-1 font-medium">{p.symbol}</td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      value={p.quantity}
                      onChange={e => updateQuantity(p.symbol, parseFloat(e.target.value)||0)}
                      className="w-16 rounded bg-white/5 px-1 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-white/30"
                      step="0.0001"
                    />
                  </td>
                  <td className="py-1 text-right tabular-nums">{pr ? pr.toLocaleString(undefined,{maximumFractionDigits:2}) : '…'}</td>
                  <td className="py-1 text-right tabular-nums">{(pr * p.quantity).toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                  <td className="py-1 pl-2">
                    <button onClick={() => remove(p.symbol)} className="text-white/40 hover:text-red-400 transition">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <form onSubmit={onAdd} className="flex gap-2 text-xs md:text-sm">
          <input
            placeholder="SYMBOL"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="flex-1 rounded bg-white/5 px-2 py-1 uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-white/30"
            aria-label="Symbole"
          />
          <input
            placeholder="Qté"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-20 rounded bg-white/5 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/30"
            aria-label="Quantité"
            type="number"
            step="0.0001"
          />
          <button type="submit" className="rounded bg-white/10 px-3 py-1 font-medium hover:bg-white/20 transition">Ajouter</button>
        </form>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <div>{loading ? 'Maj prix…' : 'À jour'}</div>
          <button type="button" onClick={() => refresh()} className="underline decoration-dotted hover:text-white/70">Refresh</button>
        </div>
      </div>
    </WatchCard>
  );
}
