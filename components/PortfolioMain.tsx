"use client";
import { usePortfolio } from '@/lib/hooks/usePortfolio';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { searchTokens, TOKENS, type TokenMeta } from '@/lib/prices/tokens';
import PortfolioChat from './PortfolioChat';

export function PortfolioMain() {
  const { positions, prices, totalValue, addPosition, updateQuantity, remove, refresh, loading } = usePortfolio([
    { id: 'bitcoin', symbol: 'BTC', quantity: 0.1 },
    { id: 'ethereum', symbol: 'ETH', quantity: 1 },
    { id: 'solana', symbol: 'SOL', quantity: 5 }
  ]);
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedToken, setSelectedToken] = useState<TokenMeta | null>(null);
  const [remote, setRemote] = useState<TokenMeta[]>([]);
  const remoteAbort = useRef<AbortController | null>(null);
  const comboRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => {
    if (!symbol.trim()) return [] as TokenMeta[];
    const q = symbol.trim();
    const local = searchTokens(q);
    const merged = [...local];
    remote.forEach(r => {
      if (!merged.find(m => m.symbol.toUpperCase() === r.symbol.toUpperCase())) merged.push(r);
    });
    return merged;
  }, [symbol, remote]);

  // Close suggestions on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const total = totalValue || 0;

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const s = symbol.trim().toUpperCase();
    const q = parseFloat(qty);
    if (!s || !q || q <= 0) { setError('Entrée invalide'); return; }
    // Resolve token meta (symbol match) for proper Coingecko id mapping
    const meta = selectedToken && selectedToken.symbol.toUpperCase() === s
      ? selectedToken
      : TOKENS.find(t => t.symbol.toUpperCase() === s);
    const id = meta ? meta.id : s.toLowerCase();
    addPosition({ symbol: s, quantity: q, id });
    setSymbol(''); setQty('');
    setSelectedToken(null);
    setShowSuggest(false);
    refresh();
  }

  // Remote fetch
  useEffect(() => {
    const q = symbol.trim();
    if (!q) { setRemote([]); return; }
    const id = setTimeout(async () => {
      try {
        remoteAbort.current?.abort();
        const ctrl = new AbortController();
        remoteAbort.current = ctrl;
        const res = await fetch(`/api/tokens?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        const list = (json.tokens || []) as any[];
        setRemote(list.map(t => ({ id: t.id, symbol: t.symbol?.toUpperCase?.() || t.symbol, name: t.name })));
      } catch {}
    }, 160); // debounce
    return () => clearTimeout(id);
  }, [symbol]);

  return (
    <section aria-label="Portefeuille" className="mt-6 md:mt-8 max-w-6xl mx-auto px-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" />
        <header className="relative z-10 flex flex-col md:flex-row md:items-end gap-4 md:gap-8 justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Portefeuille</h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-xl">Gère tes positions, valorisation temps réel (batch prix) & poids de chaque actif.</p>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Valeur Totale</span>
            <span className="text-3xl font-semibold tabular-nums text-neutral-900">{total ? total.toLocaleString(undefined,{maximumFractionDigits:2}) + ' $' : '—'}</span>
            <button onClick={() => refresh()} className="mt-2 rounded border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium hover:bg-neutral-200 transition" disabled={loading}>{loading ? 'Maj…' : 'Refresh'}</button>
          </div>
        </header>
        <div className="relative z-10 mt-8 grid gap-10 md:grid-cols-5">
          <div className="md:col-span-3">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-neutral-500">
                  <th className="text-left py-2 font-medium">Actif</th>
                  <th className="text-right py-2 font-medium">Qté</th>
                  <th className="text-right py-2 font-medium">Prix</th>
                  <th className="text-right py-2 font-medium">Valeur</th>
                  <th className="text-right py-2 font-medium">Poids</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const pr = prices[p.id]?.usd || 0;
                  const val = pr * p.quantity;
                  const weight = total ? (val / total) * 100 : 0;
                  return (
                    <tr key={p.symbol} className="border-t border-neutral-200 align-middle hover:bg-neutral-50/60">
                      <td className="py-2 font-semibold text-neutral-900">{p.symbol}</td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          value={p.quantity}
                          onChange={e => updateQuantity(p.symbol, parseFloat(e.target.value)||0)}
                          className="w-20 rounded border border-neutral-300 bg-white px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
                          step="0.0001"
                        />
                      </td>
                      <td className="py-2 text-right tabular-nums text-neutral-700">{pr ? pr.toLocaleString(undefined,{maximumFractionDigits:2}) : '…'}</td>
                      <td className="py-2 text-right tabular-nums text-neutral-700">{val ? val.toLocaleString(undefined,{maximumFractionDigits:2}) : '—'}</td>
                      <td className="py-2 text-right tabular-nums text-neutral-700">{weight ? weight.toFixed(2)+'%' : '—'}</td>
                      <td className="py-2 text-right"><button onClick={() => remove(p.symbol)} className="text-neutral-400 hover:text-neutral-900 transition" aria-label={`Supprimer ${p.symbol}`}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <form onSubmit={onAdd} className="mt-4 flex flex-wrap gap-2 text-xs md:text-sm">
              <div className="relative flex-1 md:flex-none md:w-40" ref={comboRef}>
                <input
                  placeholder="SYMBOL"
                  value={symbol}
                  onFocus={() => setShowSuggest(true)}
                  onChange={e => { setSymbol(e.target.value); setShowSuggest(true); setSelectedToken(null); }}
                  onKeyDown={e => {
                    if (!showSuggest || !suggestions.length) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % suggestions.length); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + suggestions.length) % suggestions.length); }
                    else if (e.key === 'Enter') {
                      const pick = suggestions[activeIdx];
                      if (pick) {
                        e.preventDefault();
                        setSymbol(pick.symbol.toUpperCase());
                        setSelectedToken(pick);
                        setShowSuggest(false);
                      }
                    } else if (e.key === 'Escape') { setShowSuggest(false); }
                  }}
                  className="w-full rounded border border-neutral-300 bg-white px-3 py-2 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
                  aria-label="Symbole"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSuggest && suggestions.length ? 'true' : 'false'}
                  aria-controls="symbol-suggestions"
                />
                {showSuggest && suggestions.length > 0 && (
                  <ul
                    id="symbol-suggestions"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded border border-neutral-300 bg-white shadow-sm"
                  >
                    {suggestions.map((t, i) => (
                      <li
                        key={t.id}
                        role="option"
                        aria-selected={i === activeIdx}
                        className={`px-3 py-1.5 text-[11px] flex justify-between gap-2 cursor-pointer hover:bg-neutral-100 ${i===activeIdx ? 'bg-neutral-100' : ''}`}
                        onMouseDown={(e) => { // use onMouseDown to prevent blur before click
                          e.preventDefault();
                          setSymbol(t.symbol.toUpperCase());
                          setSelectedToken(t);
                          setShowSuggest(false);
                        }}
                      >
                        <span className="font-medium text-neutral-800">{t.symbol}</span>
                        <span className="text-neutral-500 truncate">{t.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                placeholder="Qté"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-32 rounded border border-neutral-300 bg-white px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
                aria-label="Quantité"
                type="number"
                step="0.0001"
              />
              <button type="submit" className="rounded bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 font-medium transition">Ajouter</button>
              {error && <span className="text-red-600 self-center ml-2">{error}</span>}
            </form>
            <p className="mt-3 text-[11px] text-neutral-500">Tape un symbole (BTC, ETH, SOL...) puis Enter. Sélectionne dans la liste pour mapper correctement l'id Coingecko.</p>
          </div>
          <div className="md:col-span-2 space-y-5">
            <h3 className="text-sm font-semibold tracking-wide text-neutral-800">Allocation</h3>
            <ul className="space-y-2">
              {positions.map(p => {
                const pr = prices[p.id]?.usd || 0;
                const val = pr * p.quantity;
                const weight = total ? (val / total) * 100 : 0;
                return (
                  <li key={p.symbol} className="text-xs">
                    <div className="flex justify-between mb-1"><span className="font-medium text-neutral-800">{p.symbol}</span><span className="tabular-nums text-neutral-600">{weight ? weight.toFixed(1)+'%' : '—'}</span></div>
                    <div className="h-2 rounded bg-neutral-200 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: weight + '%' }}
                        transition={{ type: 'spring', stiffness: 120, damping: 26 }}
                        className="h-full bg-neutral-900"
                      />
                    </div>
                  </li>
                );
              })}
              {!positions.length && <li className="text-neutral-400 text-xs">Aucune position.</li>}
            </ul>
            <PortfolioChat snapshot={{
              positions: positions.map(p => {
                const pr = prices[p.id]?.usd || 0; return { symbol: p.symbol, quantity: p.quantity, valueUsd: pr * p.quantity };
              }),
              totalValue: total
            }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default PortfolioMain;
