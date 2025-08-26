"use client";
import { useCallback, useEffect, useRef } from 'react';

interface UsePortfolioAutoRefreshOptions {
  ids: string[];
  onPrices?: (prices: Record<string, number>) => void;
  vs?: string;
}

interface CacheEntry { at: number; data: Record<string, number>; }
const CLIENT_CACHE_TTL = 60_000; // 60s
const LS_KEY = 'cp_prices_cache_v1';

function loadLS(): { at: number; data: Record<string, number> } | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}
function saveLS(data: Record<string, number>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), data })); } catch {}
}

// Shared in-module cache (per tab)
const memCache = new Map<string, CacheEntry>();

export function usePortfolioAutoRefresh({ ids, onPrices, vs = 'usd' }: UsePortfolioAutoRefreshOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastRunRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  const priceSource = (process.env.NEXT_PUBLIC_PRICE_SOURCE || process.env.PRICE_SOURCE || '').toLowerCase();
  const enabled = priceSource === 'coingecko';

  const run = useCallback(async (reason: string) => {
    if (!enabled) return;
    if (!ids || !ids.length) return;
    if (document.hidden) return;
    const key = vs + '|' + [...ids].sort().join(',');
    const now = Date.now();
    const mem = memCache.get(key);
    if (mem && now - mem.at < CLIENT_CACHE_TTL) {
      onPrices?.(mem.data);
      if (process.env.NODE_ENV !== 'production') console.debug('cg-refresh (mem-cache)', { ids: ids.length, ms: 0, reason });
      return;
    }
    // Check LS
    const ls = loadLS();
    if (ls && now - ls.at < CLIENT_CACHE_TTL) {
      const allCovered = ids.every(id => typeof ls.data[id] === 'number');
      if (allCovered) {
        onPrices?.(ls.data);
        memCache.set(key, { at: ls.at, data: ls.data });
        if (process.env.NODE_ENV !== 'production') console.debug('cg-refresh (ls-cache)', { ids: ids.length, ms: 0, reason });
        return;
      }
    }
    // Abort previous
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    runningRef.current = true;
    const t0 = performance.now();
    try {
      const res = await fetch('/api/prices/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, vs }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error('refresh_failed_'+res.status);
      const json = await res.json();
      const prices: Record<string, number> = json.prices || {};
      if (Object.keys(prices).length) {
        onPrices?.(prices);
        memCache.set(key, { at: Date.now(), data: prices });
        saveLS(prices);
      }
      const ms = Math.round(performance.now() - t0);
      if (process.env.NODE_ENV !== 'production') console.debug('cg-refresh', { ids: ids.length, ms, reason });
    } catch (e:any) {
      if (e.name === 'AbortError') return; // silent
      // Expose failure via console (toast handled outside)
      if (process.env.NODE_ENV !== 'production') console.debug('cg-refresh-error', e.message);
    } finally {
      runningRef.current = false;
    }
  }, [ids, vs, onPrices, enabled]);

  // Initial + visibility
  useEffect(() => {
    if (!enabled) return; // don't start timers
    run('mount');
    const onVis = () => { if (!document.hidden) run('visibility'); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); };
  }, [run, enabled]);

  // Interval every 10 min
  useEffect(() => {
    if (!enabled) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => { run('interval'); }, 600_000); // 10 min
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [run, enabled, ids.join(',')]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { manualRun: run };
}
