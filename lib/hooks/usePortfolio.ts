"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PortfolioPosition {
  id: string;          // coingecko id (ex: bitcoin)
  symbol: string;      // ticker affiché (BTC)
  quantity: number;    // quantité détenue
}

export interface PortfolioState {
  positions: PortfolioPosition[];
  prices: Record<string, { usd: number }>; // prix par id
  totalValue: number;
  addPosition: (p: Omit<PortfolioPosition,'id'> & { id?: string }) => void;
  updateQuantity: (symbol: string, q: number) => void;
  remove: (symbol: string) => void;
  refresh: () => void;
  loading: boolean;
  lastUpdated?: number;
}

const LS_KEY = 'cp_portfolio_v1';
const PRICE_LS_KEY = 'cp_prices_cache_v1';
const PRICE_TTL = 30_000; // 30s aligné backend

interface StoredPrices { data: Record<string, { usd: number }>; at: number; }

function loadStored(): PortfolioPosition[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function storePositions(p: PortfolioPosition[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}
function loadPriceCache(): StoredPrices | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(PRICE_LS_KEY) || 'null'); } catch { return null; }
}
function storePriceCache(obj: StoredPrices) { try { localStorage.setItem(PRICE_LS_KEY, JSON.stringify(obj)); } catch {} }

async function fetchBatch(ids: string[]): Promise<Record<string,{usd:number}>> {
  if (!ids.length) return {};
  const url = `/api/prices?ids=${encodeURIComponent(ids.join(','))}&vs=usd`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('price fetch failed');
  return res.json();
}

export function usePortfolio(defaults: PortfolioPosition[] = []): PortfolioState {
  // Pour éviter un décalage SSR/CSR (hydration mismatch), on initialise toujours avec les defaults
  // puis on hydrate depuis localStorage après le premier render côté client.
  const [positions, setPositions] = useState<PortfolioPosition[]>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [prices, setPrices] = useState<Record<string,{usd:number}>>({});
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const ids = useMemo(() => positions.map(p => p.id || p.symbol.toLowerCase()).filter(Boolean), [positions]);

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 5_000) return; // throttle manuel si spam
    lastFetchRef.current = now;
    const cache = loadPriceCache();
    if (cache && now - cache.at < PRICE_TTL && ids.every(id => cache.data[id])) {
      setPrices(cache.data);
      return;
    }
    if (!ids.length) return;
    setLoading(true);
    try {
      const data = await fetchBatch(ids);
      setPrices(data);
      storePriceCache({ data, at: Date.now() });
    } finally {
      setLoading(false);
    }
  }, [ids]);

  // Hydrate depuis localStorage après mount uniquement
  useEffect(() => {
    const stored = loadStored();
    if (stored.length) setPositions(stored);
    setHydrated(true);
  }, []);

  // Persistance uniquement après hydratation pour ne pas écraser trop tôt le localStorage
  useEffect(() => { if (hydrated) storePositions(positions); }, [positions, hydrated]);
  useEffect(() => { refresh(); }, [refresh]);

  const totalValue = useMemo(() => positions.reduce((acc, p) => {
    const id = p.id || p.symbol.toLowerCase();
    const pr = prices[id]?.usd || 0;
    return acc + pr * p.quantity;
  }, 0), [positions, prices]);

  const addPosition = useCallback((p: Omit<PortfolioPosition,'id'> & { id?: string }) => {
    setPositions(prev => {
      if (prev.some(x => x.symbol.toUpperCase() === p.symbol.toUpperCase())) return prev; // no duplicate
      return [...prev, { id: p.id || p.symbol.toLowerCase(), symbol: p.symbol.toUpperCase(), quantity: p.quantity }];
    });
  }, []);

  const updateQuantity = useCallback((symbol: string, q: number) => {
    setPositions(prev => prev.map(p => p.symbol === symbol ? { ...p, quantity: q } : p));
  }, []);

  const remove = useCallback((symbol: string) => {
    setPositions(prev => prev.filter(p => p.symbol !== symbol));
  }, []);

  return { positions, prices, totalValue, addPosition, updateQuantity, remove, refresh, loading, lastUpdated: lastFetchRef.current };
}
