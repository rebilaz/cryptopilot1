"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePortfolio } from '@/lib/hooks/usePortfolio';
import { motion } from 'framer-motion';
import { searchTokens, TOKENS, type TokenMeta } from '@/lib/prices/tokens';
import { computeMetrics } from '@/lib/portfolio/metrics';
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
  const [remote, setRemote] = useState<TokenMeta[]>([]); // suggestions distantes déjà filtrées/rankées par l'API
  const [remoteQuery, setRemoteQuery] = useState<string>('');
  const [userTokens, setUserTokens] = useState<TokenMeta[]>([]); // tokens ajoutés manuellement (persist localStorage)
  const remoteAbort = useRef<AbortController | null>(null);
  const comboRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => {
    const q = symbol.trim();
    if (!q) return [] as TokenMeta[];
    const qLower = q.toLowerCase();
    // Si la requête distante correspond à la saisie actuelle, utilise directement remote (déjà ranké + limité par l'API)
    if (remote.length && remoteQuery === q) {
      // merge userTokens (prend ceux qui matchent mais absents)
      const merged = [...remote];
      userTokens.forEach(u => {
        if ((u.symbol.toLowerCase().startsWith(qLower) || u.name.toLowerCase().includes(qLower) || u.id.toLowerCase().startsWith(qLower)) && !merged.find(m => m.symbol.toUpperCase() === u.symbol.toUpperCase())) {
          merged.push(u);
        }
      });
      return merged;
    }
    // Fallback local
    const local = searchTokens(q, 40);
    const user = userTokens.filter(t => t.symbol.toLowerCase().startsWith(qLower) || t.name.toLowerCase().includes(qLower) || t.id.toLowerCase().startsWith(qLower));
    const merged = [...local];
    user.forEach(r => { if (!merged.find(m => m.symbol.toUpperCase() === r.symbol.toUpperCase())) merged.push(r); });
    return merged.slice(0, 40);
  }, [symbol, remote, remoteQuery, userTokens]);
  // Charger userTokens depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('userTokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setUserTokens(parsed.filter(t => t && t.id && t.symbol && t.name));
      }
    } catch {}
  }, []);

  function persistUserTokens(next: TokenMeta[]) {
    setUserTokens(next);
    try { localStorage.setItem('userTokens', JSON.stringify(next.slice(0, 5000))); } catch {}
  }

  function highlight(text: string): React.ReactNode {
    const q = symbol.trim();
    if (!q) return <>{text}</>;
    const idx = text.toUpperCase().indexOf(q.toUpperCase());
    if (idx === -1) return <>{text}</>;
    return <>{text.slice(0, idx)}<span className="font-semibold text-neutral-900">{text.slice(idx, idx+q.length)}</span>{text.slice(idx+q.length)}</>;
  }

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
  // Metrics (live update with current prices)
  const metrics = useMemo(() => {
    const enriched = positions.map(p => {
      const pr = prices[p.id]?.usd || 0; return { symbol: p.symbol, quantity: p.quantity, valueUsd: pr * p.quantity };
    });
    return computeMetrics(enriched);
  }, [positions, prices]);

  const riskLabel = useMemo(() => {
    if (!metrics.totalValue) return '—';
    if (metrics.largestWeightPct > 60 || metrics.diversificationScore < 30) return 'Risque élevé';
    if (metrics.largestWeightPct > 40 || metrics.diversificationScore < 55) return 'Risque modéré';
    return 'Risque faible';
  }, [metrics]);

  const scoreValue = Math.round(metrics.diversificationScore || 0);
  const priceMode = (process.env.NEXT_PUBLIC_PRICE_MODE || (process.env.NEXT_PUBLIC_USE_MOCK_PRICES === 'true' ? 'mock' : 'live')) as string;
  const isMock = priceMode === 'mock';

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const s = symbol.trim().toUpperCase();
    const qn = parseFloat(qty);
    if (!s || !qn || qn <= 0) { setError('Entrée invalide'); return; }
    let id: string | null = null;
    // Priorité: suggestion choisie
    if (selectedToken && selectedToken.symbol.toUpperCase() === s) {
      id = selectedToken.id;
    }
    // Ensuite: remote (BigQuery) exact symbol
    if (!id) {
      const r = remote.find(t => t.symbol.toUpperCase() === s);
      if (r) id = r.id;
    }
    // Ensuite: liste statique fallback
    if (!id) {
      const local = TOKENS.find(t => t.symbol.toUpperCase() === s);
      if (local) id = local.id;
    }
    // Si toujours inconnu et remote disponible => ne PAS appeler Coingecko (car table contient déjà tout, peut-être symbol rare)
    const remoteActive = remote.length > 0;
    // Si encore inconnu et remote non actif (pas BigQuery) et pas CMC -> résolution Coingecko
    const priceMode = (process.env.NEXT_PUBLIC_PRICE_MODE || (process.env.NEXT_PUBLIC_USE_MOCK_PRICES === 'true' ? 'mock' : '')) as string;
    const isCMC = priceMode === 'cmc';
    if (!id && !isCMC && !remoteActive) {
      try {
        const r = await fetch(`/api/resolve-token?symbol=${encodeURIComponent(s)}`);
        if (r.ok) {
          const j = await r.json();
          if (j.found && j.id) id = j.id;
        }
      } catch {}
    }
    // Fallback: use lowercase symbol
    if (!id) id = s.toLowerCase();
    addPosition({ symbol: s, quantity: qn, id });
    // Ajouter dans userTokens si absent
    const exists = userTokens.find(t => t.symbol.toUpperCase() === s);
    if (!exists) {
      const meta: TokenMeta = { id, symbol: s, name: selectedToken?.name || s };
      persistUserTokens([meta, ...userTokens].slice(0, 10000));
    }
    setSymbol(''); setQty(''); setSelectedToken(null); setShowSuggest(false);
    // Ne rafraîchit pas les prix (demande utilisateur)
  }

  // Remote fetch
  useEffect(() => {
    const q = symbol.trim();
    if (!q) { setRemote([]); setRemoteQuery(''); return; }
    const id = setTimeout(async () => {
      try {
        remoteAbort.current?.abort();
        const ctrl = new AbortController();
        remoteAbort.current = ctrl;
        const res = await fetch(`/api/tokens?q=${encodeURIComponent(q)}&limit=35&debug=1`, { signal: ctrl.signal, cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const list = (json.tokens || []) as any[];
        // Debug console pour diagnostiquer absence de suggestions
        if (list.length === 0) {
          console.debug('[suggestions] vide pour', q, json);
        }
        setRemote(list.map(t => ({ id: t.id, symbol: t.symbol?.toUpperCase?.() || t.symbol, name: t.name || t.symbol })));
        setRemoteQuery(q);
      } catch (e) {
        console.debug('[suggestions] fetch erreur', e);
      }
    }, 160);
    return () => clearTimeout(id);
  }, [symbol]);

  return (
    <section aria-label="Portefeuille" className="mt-6 md:mt-8 max-w-6xl mx-auto px-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" />
        <header className="relative z-10 flex flex-col md:flex-row md:items-end gap-4 md:gap-8 justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-3">Portefeuille {isMock && (<span className="text-[10px] uppercase tracking-wide bg-neutral-900 text-white px-2 py-1 rounded">Mock</span>)} {!isMock && (<span className="text-[10px] uppercase tracking-wide bg-emerald-600 text-white px-2 py-1 rounded">Live</span>)}</h2>
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
                        <span className="font-medium text-neutral-800">{highlight(t.symbol)}</span>
                        <span className="text-neutral-500 truncate">{highlight(t.name)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {showSuggest && symbol.trim() && suggestions.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-[11px] text-neutral-500">Aucune suggestion</div>
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
            <p className="mt-3 text-[11px] text-neutral-500">Tape un symbole (BTC, ETH, SOL...). Si aucune suggestion n'est choisie, le système tente une résolution automatique (Coingecko) sinon utilise le symbole brut.</p>
          </div>
          <div className="md:col-span-2 space-y-5">
            {/* Score / Risk summary */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Score diversification</span>
                <span className="text-neutral-500">{scoreValue}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">{riskLabel}</span>
                <span className="text-neutral-500">Max {metrics.largestWeightPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span>Stablecoins</span>
                <span>{metrics.stableWeightPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded bg-neutral-200 overflow-hidden" aria-label="Diversification score barre">
                <motion.div initial={{ width: 0 }} animate={{ width: scoreValue + '%' }} className="h-full bg-neutral-900" />
              </div>
            </div>
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
