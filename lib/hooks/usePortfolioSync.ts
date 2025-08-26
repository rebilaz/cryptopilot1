"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

export type Position = { id: string; assetId: string; symbol: string; name?: string; amount: number };
export interface SyncAPI {
  positions: Position[];
  version: number; // bump à chaque refetch/merge pour forcer re-render déterministe
  loading: boolean; // initial load
  syncing: boolean; // ongoing mutation
  error?: string;
  importLocalIfServerEmpty(): Promise<void>;
  add(p: Omit<Position,'id'>): Promise<void>;
  update(id: string, patch: Partial<Pick<Position,'amount'|'symbol'|'name'>>): Promise<void>;
  remove(id: string): Promise<void>;
  refetch(): Promise<void>;
  merge(writes: any[]): void; // apply server-provided write hints optimistiquement
  serverEmpty: boolean;
  offerImport: boolean; // convenience flag
  hideImport(): void;
  localHasData: boolean;
}

// Fallback toast (replace by shadcn if available)
function showToastError(msg: string) {
  if (typeof window !== 'undefined') {
    if ((window as any).toast) (window as any).toast.error(msg); else console.error('[toast]', msg);
  }
}

let tempCounter = 0;

export function usePortfolioSync(): SyncAPI {
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;
  const [positions, setPositions] = useState<Position[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string|undefined>(undefined);
  const [serverEmpty, setServerEmpty] = useState(false);
  const [offerImport, setOfferImport] = useState(false);
  const [localHasData, setLocalHasData] = useState(false);
  const opSeq = useRef(0);

  const refetch = useCallback(async () => {
    console.log('[sync] refetch start');
    setError(undefined);
    setLoading(true);
    try {
      const res = await fetch('/api/me/portfolio', { method: 'GET', cache: 'no-store', headers: { 'x-sync': '1' }, credentials: 'include' });
      const json = await res.json().catch(()=>({ ok:false, error:'network', portfolio:{ id:null, positions:[] } }));
      const next = Array.isArray(json?.portfolio?.positions) ? json.portfolio.positions : [];
      if (!json.ok) {
        if (json.error === 'unauthenticated') setError('auth');
        else if (json.error === 'server_error') setError('server');
        else setError('network');
        setPositions([]);
        setServerEmpty(true);
      } else {
        const fresh: Position[] = next.map((p:any) => ({ id: p.id, assetId: p.assetId || p.symbol?.toLowerCase?.() || p.id, symbol: p.symbol, name: p.name, amount: p.amount }));
        setPositions(fresh.map(p => ({ ...p })));
        const empty = !json.portfolio?.id || fresh.length === 0;
        setServerEmpty(empty);
        if (fresh.length) {
          try { localStorage.removeItem('cp_portfolio_v1'); } catch {}
          setOfferImport(false); setLocalHasData(false);
        } else if (empty) {
          const localRaw = typeof window !== 'undefined' ? localStorage.getItem('cp_portfolio_v1') : null;
          if (localRaw) {
            try { const localArr = JSON.parse(localRaw); if (Array.isArray(localArr) && localArr.length) setOfferImport(true); } catch {}
          }
        }
      }
    } catch (e:any) {
      setError('network');
      setPositions([]);
    } finally {
      setVersion(v => { const nv = v + 1; console.log('[sync] refetch done, positions:', positions.length, 'version:', nv); return nv; });
      setLoading(false);
    }
  }, [positions.length]);

  const retry = useCallback(() => { refetch(); }, [refetch]);

  // Initial fetch when logged in
  useEffect(() => {
    // Detect local data once on mount
    try {
      const raw = localStorage.getItem('cp_portfolio_v1');
      if (raw) {
        const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) setLocalHasData(true);
      }
    } catch {}
    refetch();
  }, [userId]);

  const importLocalIfServerEmpty = useCallback(async () => {
    if (!userId) return;
    const raw = localStorage.getItem('cp_portfolio_v1');
    let arr: any[] = [];
    try { arr = JSON.parse(raw || '[]'); } catch { arr = []; }
    if (!Array.isArray(arr) || !arr.length) { setOfferImport(false); return; }
    setSyncing(true);
    try {
      const payload = arr.map(p => ({ assetId: p.id || p.symbol.toLowerCase(), symbol: p.symbol, name: p.symbol, amount: p.quantity }));
      const res = await fetch('/api/me/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positions: payload }) });
      if (!res.ok) throw new Error('import_failed');
      localStorage.removeItem('cp_portfolio_v1');
      await refetch();
    } catch (e:any) {
      showToastError('Import impossible');
    } finally { setSyncing(false); setOfferImport(false); }
  }, [userId, refetch]);

  async function doOptimistic<T>(applyOptimistic: () => void, apiCall: () => Promise<T>, rollback: () => void) {
    setSyncing(true);
    const snapshot = positions;
    try {
      applyOptimistic();
      await apiCall();
      // fire & forget refetch
      refetch();
    } catch (e:any) {
      rollback();
      setPositions(snapshot); // ensure rollback
      showToastError('Synchronisation échouée');
    } finally { setSyncing(false); }
  }

  const add = useCallback(async (p: Omit<Position,'id'>) => {
    if (!userId) return;
    const tempId = 'temp_'+(++tempCounter);
    await doOptimistic(
      () => setPositions(prev => [...prev, { id: tempId, ...p }]),
      async () => {
        const res = await fetch('/api/me/position', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: p.assetId, symbol: p.symbol, name: p.name, amount: p.amount }) });
        if (!res.ok) throw new Error('add_failed');
      },
      () => setPositions(prev => prev.filter(x => x.id !== tempId))
    );
  }, [userId, positions]);

  const update = useCallback(async (id: string, patch: Partial<Pick<Position,'amount'|'symbol'|'name'>>) => {
    if (!userId) return;
    const prev = positions.find(p => p.id === id);
    if (!prev) return;
    await doOptimistic(
      () => setPositions(list => list.map(p => p.id === id ? { ...p, ...patch } : p)),
      async () => {
        const res = await fetch(`/api/me/position/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
        if (!res.ok) throw new Error('update_failed');
      },
      () => setPositions(list => list.map(p => p.id === id ? prev : p))
    );
  }, [userId, positions]);

  const remove = useCallback(async (id: string) => {
    if (!userId) return;
    const prev = positions.find(p => p.id === id);
    if (!prev) return;
    await doOptimistic(
      () => setPositions(list => list.filter(p => p.id !== id)),
      async () => {
        const res = await fetch(`/api/me/position/${id}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) throw new Error('delete_failed');
      },
      () => setPositions(list => [...list, prev])
    );
  }, [userId, positions]);

  const merge = useCallback((writes: any[]) => {
    if (!Array.isArray(writes) || !writes.length) return;
    setPositions(prev => {
      const map = new Map(prev.map(p => [p.assetId || p.id || (p.symbol?.toLowerCase()), { ...p }]));
      for (const w of (writes ?? [])) {
        const key = w.assetId;
        if (!key) continue;
        const cur = map.get(key);
        if (cur) {
          const after = typeof w.afterAmt === 'number' ? w.afterAmt : (cur.amount ?? 0) + (w.delta ?? 0);
          map.set(key, { ...cur, amount: after });
        } else {
          map.set(key, { id: key, assetId: key, symbol: (w.symbol || key).toUpperCase(), name: (w.symbol || key).toUpperCase(), amount: w.afterAmt ?? (w.delta ?? 0) });
        }
      }
      const out = Array.from(map.values());
      return out.map(p => ({ ...p }));
    });
    setVersion(v => v + 1);
  }, []);

  return { positions, version, loading, syncing, error, importLocalIfServerEmpty, add, update, remove, refetch, merge, serverEmpty, offerImport, hideImport: () => setOfferImport(false), localHasData };
}
