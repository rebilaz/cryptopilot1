"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePortfolio } from '@/lib/hooks/usePortfolio';
import { motion } from 'framer-motion';
import { searchTokens, TOKENS, type TokenMeta } from '@/lib/prices/tokens';
import { usePrices } from '@/lib/hooks/usePrices';
import { computeMetrics } from '@/lib/portfolio/metrics';
import { normalizeAsset } from '@/lib/prices/normalizeAsset';
import { usePortfolioAutoRefresh } from '@/lib/hooks/usePortfolioAutoRefresh';
import { useSession } from 'next-auth/react';
import { usePortfolioSync } from '@/lib/hooks/usePortfolioSync';
import PortfolioChat from './PortfolioChat';
import TransactionsHistory from './TransactionsHistory';

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
  const [results, setResults] = useState<TokenMeta[]>([]); // résultats actuels de l'autocomplete
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [userTokens, setUserTokens] = useState<TokenMeta[]>([]); // tokens ajoutés manuellement (persist localStorage)
  const remoteAbort = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');
  const cacheRef = useRef<Map<string, { ts: number; data: TokenMeta[] }>>(new Map());
  const suggestionListRef = useRef<HTMLUListElement | null>(null);
  const comboRef = useRef<HTMLDivElement | null>(null);
  const fetchSeqRef = useRef(0); // requestId séquence
  const [portalPos, setPortalPos] = useState<{ left:number; top:number; width:number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data: session } = useSession();
  const sync = usePortfolioSync();
  const rawEffective = session ? sync.positions.map(p => ({ id: p.assetId, symbol: p.symbol, quantity: p.amount, origId: p.id })) : positions;
  const effectivePositions = useMemo(() => {
    const map = new Map<string, { id: string; symbol: string; quantity: number; origId?: string }>();
    for (const p of rawEffective as any[]) {
      const canonicalId = normalizeAsset(p.id || p.assetId || p.symbol || '');
      const qty = p.quantity ?? p.amount ?? 0;
      const meta = TOKENS.find(t => t.id === canonicalId);
      const displaySymbol = (meta?.symbol || p.symbol || canonicalId).toUpperCase();
      const existing = map.get(canonicalId);
      if (existing) {
        existing.quantity += qty;
        existing.origId = p.origId || existing.origId;
      } else {
        map.set(canonicalId, { id: canonicalId, symbol: displaySymbol, quantity: qty, origId: p.origId });
      }
    }
    return Array.from(map.values());
  }, [rawEffective, sync.version]);
  // Build dynamic price ids set (server sync or demo positions)
  const priceInputs = useMemo(() => {
    return (effectivePositions as any[]).map(p => ({ assetId: p.id || p.assetId, symbol: p.symbol }));
  }, [effectivePositions]);
  useEffect(() => { console.log('[ui] price inputs', priceInputs); }, [priceInputs]);
  const { prices: livePrices, unknown: unknownPrices } = usePrices(priceInputs, 'usd');
  const total = useMemo(() => effectivePositions.reduce((acc, p: any) => {
    const baseId = p.id || p.assetId || p.symbol.toLowerCase();
    let pr = livePrices?.[baseId]?.usd;
    if (pr == null && p.symbol) {
      const meta = TOKENS.find(t => t.symbol.toUpperCase() === (p.symbol||'').toUpperCase());
      if (meta) pr = livePrices?.[meta.id]?.usd;
    }
    const qty = p.quantity ?? p.amount ?? 0;
    return acc + (pr ? pr * qty : 0);
  }, 0), [effectivePositions, livePrices]);

  // Metrics (diversification, concentration, etc.)
  const metrics = useMemo(() => {
    const metricPositions = effectivePositions.map((p: any) => {
      const baseId = p.id || p.assetId || p.symbol.toLowerCase();
      const qty = p.quantity ?? p.amount ?? 0;
      let pr = livePrices?.[baseId]?.usd || 0;
      if (!pr && p.symbol) {
        const meta = TOKENS.find(t => t.symbol.toUpperCase() === (p.symbol||'').toUpperCase());
        if (meta) pr = livePrices?.[meta.id]?.usd || pr;
      }
      return { symbol: p.symbol, quantity: qty, valueUsd: pr * qty };
    });
    return computeMetrics(metricPositions);
  }, [effectivePositions, livePrices]);
  const scoreValue = Math.round(metrics.diversificationScore);
  const riskLabel = metrics.largestWeightPct > 60 ? 'Risque élevé' : metrics.largestWeightPct > 40 ? 'Risque modéré' : metrics.largestWeightPct > 25 ? 'Équilibré' : 'Diversifié';
  const isMock = !session; // simple flag: non authentifié => mode démo

  // Suggestions finales: résultats réseau (si query >=2) + tokens utilisateur additionnels
  const suggestions = useMemo(() => {
    const q = symbol.trim();
    if (!q) return [] as TokenMeta[];
    const base = q.length >= 2 ? results : [];
    const lower = q.toLowerCase();
    const extra = userTokens.filter(t => (t.symbol.toLowerCase().startsWith(lower) || t.name.toLowerCase().includes(lower)) && !base.find(b => b.symbol.toUpperCase() === t.symbol.toUpperCase()));
    return [...base, ...extra].slice(0, 50);
  }, [symbol, results, userTokens]);
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
    const regex = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, r => '\\' + r), 'ig');
    const parts: React.ReactNode[] = [];
    let lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
      parts.push(<mark key={m.index} className="bg-yellow-200/70 dark:bg-yellow-300/20 px-0.5 rounded">{m[0]}</mark>);
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return <>{parts}</>;
  }

  // Form submit handler (add position)
  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const s = symbol.trim().toUpperCase();
    const qn = parseFloat(qty);
    if (!s || !qn || qn <= 0) { setError('Entrée invalide'); return; }
    let id: string | null = null;
    if (selectedToken && selectedToken.symbol.toUpperCase() === s) id = selectedToken.id;
    if (!id) {
      const local = TOKENS.find(t => t.symbol.toUpperCase() === s);
      if (local) id = local.id;
    }
    const priceSource = (process.env.NEXT_PUBLIC_PRICE_SOURCE || process.env.NEXT_PUBLIC_PRICE_MODE || '').toLowerCase();
    const isCMC = priceSource === 'cmc';
    if (!id) {
      if (isCMC) id = s.toLowerCase(); else { setError('Sélectionne un token dans la liste (id requis)'); return; }
    }
    if (session) {
      await sync.add({ assetId: id, symbol: s, amount: qn, name: selectedToken?.name || s });
    } else {
      addPosition({ symbol: s, quantity: qn, id });
    }
    const exists = userTokens.find(t => t.symbol.toUpperCase() === s);
    if (!exists) persistUserTokens([{ id, symbol: s, name: selectedToken?.name || s }, ...userTokens].slice(0, 10000));
    setSymbol(''); setQty(''); setSelectedToken(null); setShowSuggest(false);
  };

  // Remote fetch
  // Autocomplete fetch (debounce 200ms) vers /api/tokens/search
  const normalizeQuery = (input: string) => input
    .normalize('NFD')
    .replace(/\p{Diacritic}+?/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const normalizeForMatch = (s: string) => s
    .normalize('NFD')
    .replace(/\p{Diacritic}+?/gu, '')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase();

  const rankResults = (arr: TokenMeta[], rawQ: string) => {
    const q = normalizeForMatch(rawQ);
    return [...arr].sort((a,b) => {
      const as = normalizeForMatch(a.symbol || '');
      const bs = normalizeForMatch(b.symbol || '');
      const an = normalizeForMatch(a.name || '');
      const bn = normalizeForMatch(b.name || '');
      const aScore = as === q ? 3 : (as.startsWith(q) ? 2 : (an.includes(q) ? 1 : 0));
      const bScore = bs === q ? 3 : (bs.startsWith(q) ? 2 : (bn.includes(q) ? 1 : 0));
      if (bScore !== aScore) return bScore - aScore;
      const ar = (a as any).rank ?? (a as any).market_cap_rank ?? Number.MAX_SAFE_INTEGER;
      const br = (b as any).rank ?? (b as any).market_cap_rank ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return as.localeCompare(bs);
    }).slice(0,50);
  };

  const fetchPass = async (qNorm: string, pass: 1 | 2, limit: number, signal: AbortSignal, requestId: number): Promise<void> => {
    const t0 = performance.now();
    const res = await fetch(`/api/tokens/search?q=${encodeURIComponent(qNorm)}&limit=${limit}`, { signal });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();
  const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.results) ? json.results : [];
  if (process.env.NODE_ENV !== 'production') console.debug('autocomplete payload', Array.isArray(json), rawList.length, Object.keys(rawList[0]||{}));
  const list: TokenMeta[] = rawList.map((t: any) => ({ id: t.id, symbol: (t.symbol||'').toUpperCase(), name: t.name, rank: t.rank }));
    // Appliquer seulement si c'est la dernière requête encore active
    if (requestId !== fetchSeqRef.current) return;
    const ranked = rankResults(list, qNorm);
  if (list.length > 0) { setShowSuggest(true); setNoResults(false); }
    if (process.env.NODE_ENV !== 'production') console.debug('suggest', { q: qNorm, count: ranked.length, keys: Object.keys(ranked[0]||{}) });
    const ms = Math.round(performance.now() - t0);
    if (process.env.NODE_ENV !== 'production') console.debug('[autocomplete]', { q: qNorm, pass, limit, resultsCount: ranked.length, ms });
    setResults(ranked);
    setNoResults(ranked.length === 0);
  };

  const triggerSearch = useCallback((raw: string) => {
    const qNorm = normalizeQuery(raw);
    if (qNorm.length < 2) { setResults([]); setNoResults(false); setSuggestError(null); lastQueryRef.current=''; return; }
    if (lastQueryRef.current === qNorm) return; // same active query
    lastQueryRef.current = qNorm;
    setSelectedToken(null);
    const firstKey = `${qNorm}|25`;
    const now = Date.now();
    const firstCache = cacheRef.current.get(firstKey);
    const validFirstCache = firstCache && (now - firstCache.ts) < (firstCache.data.length ? 30_000 : 5_000);
    const trySecond = async () => {
      if (qNorm.length < 3) { setNoResults(true); return; }
      const secondKey = `${qNorm}|100`;
      const secondCache = cacheRef.current.get(secondKey);
      const validSecondCache = secondCache && (now - secondCache.ts) < (secondCache.data.length ? 30_000 : 5_000);
      if (validSecondCache) {
        const ranked = rankResults(secondCache.data, qNorm); setResults(ranked); setNoResults(ranked.length === 0); return;
      }
      remoteAbort.current?.abort();
      const ctrl2 = new AbortController();
      remoteAbort.current = ctrl2;
      setLoadingSuggest(true);
      try {
        const reqId = ++fetchSeqRef.current;
        await fetchPass(qNorm, 2, 100, ctrl2.signal, reqId);
        if (reqId === fetchSeqRef.current) {
          // store raw (unranked) we only have ranked; keep same
          cacheRef.current.set(secondKey, { ts: Date.now(), data: results });
        }
      } catch (e:any) {
        if (e.name !== 'AbortError') { setSuggestError(e.message || 'Erreur'); }
      } finally { setLoadingSuggest(false); }
    };
    if (validFirstCache) {
      const ranked = rankResults(firstCache!.data, qNorm); setResults(ranked); setNoResults(ranked.length === 0);
      if (ranked.length === 0) void trySecond();
      return;
    }
    remoteAbort.current?.abort();
    const ctrl = new AbortController();
    remoteAbort.current = ctrl;
    setLoadingSuggest(true); setSuggestError(null); setNoResults(false);
    const reqId = ++fetchSeqRef.current;
    fetchPass(qNorm, 1, 25, ctrl.signal, reqId)
      .then(() => {
        if (reqId !== fetchSeqRef.current) return;
        const current = results; // already ranked & set by fetchPass
        cacheRef.current.set(firstKey, { ts: Date.now(), data: current });
        if (current.length === 0) void trySecond();
      })
      .catch(e => { if (e.name !== 'AbortError') { setSuggestError(e.message || 'Erreur'); setResults([]); setNoResults(false); } })
      .finally(() => { setLoadingSuggest(false); });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = symbol;
    if (!q) { setResults([]); setNoResults(false); setSuggestError(null); lastQueryRef.current = ''; return; }
    debounceRef.current = setTimeout(() => triggerSearch(q), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [symbol, triggerSearch]);

  // Portal position update
  useEffect(() => {
    if (showSuggest && comboRef.current) {
      const r = comboRef.current.getBoundingClientRect();
      setPortalPos({ left: r.left + window.scrollX, top: r.bottom + window.scrollY, width: r.width });
    }
  }, [showSuggest, symbol]);

  const [showHistory, setShowHistory] = useState(false);

  return (
    <section aria-label="Portefeuille" className="mt-6 md:mt-8 max-w-6xl mx-auto px-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" />
        <header className="relative z-10 flex flex-col md:flex-row md:items-end gap-4 md:gap-8 justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-3">Portefeuille {isMock && (<span className="text-[10px] uppercase tracking-wide bg-neutral-900 text-white px-2 py-1 rounded">Mock</span>)} {!isMock && (<span className="text-[10px] uppercase tracking-wide bg-emerald-600 text-white px-2 py-1 rounded">Live</span>)}</h2>
              <button
                type="button"
                onClick={() => setShowHistory(v => !v)}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium border border-neutral-300 transition bg-neutral-100 hover:bg-neutral-200 text-neutral-800 ${showHistory ? 'ring-1 ring-neutral-500' : ''}`}
                aria-pressed={showHistory}
              >
                <span className="inline-block w-3.5 h-3.5 relative">{/* clock icon */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 15 15" /></svg>
                </span>
                Historique
              </button>
              <button
                type="button"
                onClick={() => console.log('[debug] effectivePositions', effectivePositions)}
                className="rounded bg-neutral-100 hover:bg-neutral-200 px-3 py-1 text-sm"
              >Debug positions</button>
            </div>
            <p className="text-sm text-neutral-600 max-w-xl">Gère tes positions, valorisation temps réel (batch prix) & poids de chaque actif.</p>
          </div>
            <div className="flex flex-col items-start md:items-end">
            <span className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Valeur Totale</span>
            <span className="text-3xl font-semibold tabular-nums text-neutral-900">{total ? total.toLocaleString(undefined,{maximumFractionDigits:2}) + ' $' : '—'}</span>
              {unknownPrices?.length ? <span className="mt-1 text-[10px] text-amber-600">{unknownPrices.length} inconnu(s)</span> : null}
            <button
              onClick={() => refresh()}
              className="mt-2 rounded border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />}
              {loading ? 'Maj…' : 'Refresh'}
            </button>
          </div>
        </header>
        <div className="relative z-10 mt-8 grid gap-10 md:grid-cols-5">
      {session && sync.offerImport && (
            <div className="md:col-span-5 mb-4 rounded border border-amber-300 bg-amber-50 p-3 flex items-center justify-between text-xs text-amber-900">
              <span>Des positions locales ont été détectées. Importer dans ton compte ?</span>
              <div className="flex gap-2">
        <button onClick={sync.importLocalIfServerEmpty} className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">Importer</button>
        <button onClick={sync.hideImport} className="px-3 py-1 rounded border border-amber-400 hover:bg-amber-100">Ignorer</button>
              </div>
            </div>
          )}
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
              <tbody key={session ? sync.version : undefined}>
                {effectivePositions
                  .slice()
                  .sort((a: any,b: any) => {
                    const qa = (a.quantity ?? a.amount ?? 0); const qb = (b.quantity ?? b.amount ?? 0);
                    if (qb !== qa) return qb - qa;
                    return (a.symbol||'').localeCompare(b.symbol||'');
                  })
                  .map((p: any) => {
                    const baseId = p.id || p.assetId || p.symbol?.toLowerCase?.() || '';
                    const qty = p.quantity ?? p.amount ?? 0;
                    let pr = livePrices?.[baseId]?.usd;
                    if (pr == null && p.symbol) {
                      const meta = TOKENS.find(t => t.symbol.toUpperCase() === (p.symbol||'').toUpperCase());
                      if (meta) pr = livePrices?.[meta.id]?.usd;
                    }
                    const val = pr != null ? pr * qty : null;
                    const weight = (pr != null) && total ? (val! / total) * 100 : 0;
                    const unknown = pr == null;
                    return (
                      <tr key={p.origId || p.symbol} className="border-t border-neutral-200 align-middle hover:bg-neutral-50/60 opacity-100">
                        <td className="py-2 font-semibold text-neutral-900 flex items-center gap-2">
                          <span>{p.symbol}</span>
                          {unknown && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600">Inconnu</span>}
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            value={qty}
                            onChange={e => { const v = parseFloat(e.target.value)||0; if (session) { const serverId = (p as any).origId; if (serverId) sync.update(serverId, { amount: v }); } else { updateQuantity(p.symbol, v); } }}
                            className="w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
                            step="0.0001"
                          />
                        </td>
                        <td className="py-2 text-right tabular-nums text-neutral-700">{pr != null ? pr.toLocaleString(undefined,{maximumFractionDigits:2}) : '…'}</td>
                        <td className="py-2 text-right tabular-nums text-neutral-700">{val != null ? val.toLocaleString(undefined,{maximumFractionDigits:2}) : '—'}</td>
                        <td className="py-2 text-right tabular-nums text-neutral-700">{pr != null && weight ? weight.toFixed(2)+'%' : '—'}</td>
                        <td className="py-2 text-right"><button onClick={() => { if (session) { const serverId = (p as any).origId; if (serverId) sync.remove(serverId); } else { remove(p.symbol); } }} className="text-neutral-400 hover:text-neutral-900 transition" aria-label={`Supprimer ${p.symbol}`}>×</button></td>
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
                  ref={inputRef}
                  onChange={e => { setSymbol(e.target.value); setShowSuggest(true); if (selectedToken) setSelectedToken(null); }}
                  onKeyDown={e => {
                    if (!showSuggest) return;
                    if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setActiveIdx(i => (i + 1) % suggestions.length); }
                    else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActiveIdx(i => (i - 1 + suggestions.length) % suggestions.length); }
                    else if (e.key === 'Enter') {
                      if (suggestions.length) {
                        const pick = suggestions[activeIdx];
                        if (pick) {
                          e.preventDefault();
                          setSymbol(pick.symbol.toUpperCase());
                          setSelectedToken(pick);
                          setShowSuggest(false);
                        }
                      }
                    } else if (e.key === 'Tab') {
                      if (showSuggest && suggestions.length) {
                        const pick = suggestions[activeIdx];
                        if (pick) { setSymbol(pick.symbol.toUpperCase()); setSelectedToken(pick); }
                      }
                    } else if (e.key === 'Escape') { setShowSuggest(false); }
                  }}
                  className="w-full rounded border border-neutral-300 bg-white px-3 py-2 uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
                  aria-label="Symbole"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSuggest ? 'true' : 'false'}
                  aria-controls="symbol-suggestions"
                  aria-activedescendant={showSuggest && suggestions.length ? `option-${activeIdx}` : undefined}
                />
                {process.env.NODE_ENV !== 'production' && suggestions.length > 0 && showSuggest && (
                  <span className="absolute top-1 right-2 text-[10px] px-1 rounded bg-neutral-900 text-white">{suggestions.length}</span>
                )}
                {showSuggest && portalPos && createPortal((() => {
                  const qLen = symbol.trim().length;
                  const panelCommon = {
                    position: 'fixed' as const,
                    top: portalPos.top,
                    left: portalPos.left,
                    width: portalPos.width
                  };
                  const panelClass = 'z-[2147483647] max-h-72 overflow-auto rounded-xl shadow-xl border border-neutral-300 bg-white ring-1 ring-black/10 text-neutral-900';
                  if (qLen < 2) {
                    return (
                      <div id="symbol-suggestions" role="listbox" style={panelCommon} className={panelClass}>
                        <div className="px-3 py-2 text-[11px] text-neutral-600">Saisir 2 lettres min.</div>
                      </div>
                    );
                  }
                  if (loadingSuggest) {
                    return (
                      <div id="symbol-suggestions" role="listbox" style={panelCommon} className={panelClass}>
                        <div className="px-3 py-2 text-[11px] flex items-center gap-2 text-neutral-600">
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"></span>
                          Chargement…
                        </div>
                      </div>
                    );
                  }
                  if (suggestError) {
                    return (
                      <div id="symbol-suggestions" role="listbox" style={panelCommon} className={panelClass}>
                        <div className="px-3 py-2 text-[11px] text-red-600">Erreur: {suggestError}</div>
                      </div>
                    );
                  }
                  if (noResults) {
                    return (
                      <div id="symbol-suggestions" role="listbox" style={panelCommon} className={panelClass}>
                        <div className="px-3 py-2 text-[11px] text-neutral-600">Aucune suggestion</div>
                      </div>
                    );
                  }
                  if (!suggestions.length) return null;
                  return (
                    <ul
                      id="symbol-suggestions"
                      role="listbox"
                      ref={suggestionListRef}
                      style={panelCommon}
                      className={panelClass}
                    >
                      {suggestions.map((t, i) => {
                        const active = i === activeIdx;
                        const selected = selectedToken?.id === t.id;
                        return (
                          <li
                            key={t.id}
                            id={`option-${i}`}
                            role="option"
                            aria-selected={active}
                            data-active={active || undefined}
                            className={`px-3 min-h-10 py-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-neutral-100 ${active ? 'bg-neutral-100 data-[active=true]:bg-neutral-100' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSymbol(t.symbol.toUpperCase());
                              setSelectedToken(t);
                              setShowSuggest(false);
                            }}
                          >
                            <span className="font-semibold text-neutral-900 truncate max-w-[40%]">{highlight(t.symbol)}</span>
                            <span className="text-neutral-900 truncate flex-1">— {highlight(t.name)}</span>
                            {selected && <span className="text-emerald-600 text-xs ml-2">✓</span>}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })(), document.body)}
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
              {effectivePositions
                .slice()
                .sort((a:any,b:any)=>{
                  const qa = (a.quantity ?? a.amount ?? 0); const qb = (b.quantity ?? b.amount ?? 0);
                  if (qb !== qa) return qb - qa; return (a.symbol||'').localeCompare(b.symbol||'');
                })
                .map((p:any) => {
                  const baseId = p.id || p.assetId || p.symbol?.toLowerCase?.() || '';
                  const qty = p.quantity ?? p.amount ?? 0;
          let pr: number | null = livePrices?.[baseId]?.usd ?? null;
                  if (pr == null || pr === 0) {
                    if (p.symbol) {
                      const meta = TOKENS.find(t => t.symbol.toUpperCase() === (p.symbol||'').toUpperCase());
            if (meta) { const alt = livePrices?.[meta.id]?.usd; if (typeof alt === 'number') pr = alt; }
                    }
                  }
                    const val = pr != null ? pr * qty : null;
                    const weight = (pr != null) && total ? (val! / total) * 100 : 0;
                  return (
                    <li key={p.origId || p.symbol} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-neutral-800 flex items-center gap-2">{p.symbol}{pr==null && <span className="text-[8px] uppercase tracking-wide px-1 py-0.5 rounded bg-neutral-200 text-neutral-600">Inconnu</span>}</span>
                        <span className="tabular-nums text-neutral-600">{pr && weight ? weight.toFixed(1)+'%' : '—'}</span>
                      </div>
                      <div className="h-2 rounded bg-neutral-200 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: pr ? (weight + '%') : '0%' }}
                          transition={{ type: 'spring', stiffness: 120, damping: 26 }}
                          className="h-full bg-neutral-900"
                        />
                      </div>
                    </li>
                  );
                })}
              {!effectivePositions.length && <li className="text-neutral-400 text-xs">Aucune position.</li>}
            </ul>
            <PortfolioChat snapshot={{
              positions: effectivePositions.map((p:any) => {
                const baseId = p.id || p.assetId || p.symbol.toLowerCase();
                const qty = p.quantity ?? p.amount ?? 0; let pr = prices[baseId]?.usd || 0; if (!pr && p.symbol) { const meta = TOKENS.find(t => t.symbol.toUpperCase() === p.symbol.toUpperCase()); if (meta) pr = prices[meta.id]?.usd || pr; } return { symbol: p.symbol, quantity: qty, valueUsd: pr * qty };
              }),
              totalValue: total
            }} />
          </div>
        </div>
        {showHistory && (
          <div className="mt-10">
            <h3 className="text-sm font-semibold mb-3 text-neutral-800 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 15 15" /></svg>
              Historique des transactions
            </h3>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <TransactionsHistory />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PortfolioMain;
