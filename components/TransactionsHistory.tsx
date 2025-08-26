"use client";
import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';

// Instrumented fetcher (discreet console logs: fetch time + number of transactions)
const fetcher = async (url: string) => {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('network');
  const json = await r.json();
  const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  // Log only in dev to stay discreet in production
  if (process.env.NODE_ENV !== 'production') {
    const count = Array.isArray(json?.transactions) ? json.transactions.length : undefined;
    // Example: [transactions] fetched count=42 in 123ms
    console.log('[transactions] fetched', `count=${count}`, `in=${Math.round(end - start)}ms`);
  }
  return json;
};

interface TxnRow {
  userId: string;
  portfolioId: string;
  action: string;
  symbol?: string;
  assetId?: string;
  delta?: number;
  beforeAmt?: number;
  afterAmt?: number;
  price?: number;
  meta?: any;
  source?: string;
  createdAt?: string; // ISO timestamp
}

const ACTION_COLORS: Record<string, string> = {
  add_position: 'bg-green-100 text-green-700',
  update_quantity: 'bg-blue-100 text-blue-700',
  remove_position: 'bg-red-100 text-red-700',
  sell_percent: 'bg-amber-100 text-amber-700',
  rebalance: 'bg-purple-100 text-purple-700',
  diversify: 'bg-teal-100 text-teal-700'
};

// (Legacy helpers removed; Intl formatters used inside component)

export const TransactionsHistory: React.FC<{ limit?: number }> = ({ limit = 200 }) => {
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }), []);
  const numFormatter = useMemo(() => new Intl.NumberFormat(undefined, { minimumFractionDigits:0, maximumFractionDigits:6 }), []);

  const formatDate = (d?: string) => {
    if (!d) return '';
    try { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dateFormatter.format(dt); } catch { return d; }
  };
  const formatNum = (v: any) => { if (v === null || v === undefined) return ''; const n = Number(v); if (!Number.isFinite(n)) return ''; return numFormatter.format(n); };
  const { data, error, isLoading } = useSWR(`/api/me/transactions?limit=${Math.min(limit,200)}`, fetcher, { refreshInterval: 60_000 });
  const [assetFilter, setAssetFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const pageSize = 25; // fixed per spec

  const txns: TxnRow[] = data?.transactions || [];

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [assetFilter, actionFilter, txns.length]);

  const filtered = useMemo(() => {
    return txns.filter(t => {
      if (actionFilter && t.action !== actionFilter) return false;
      if (assetFilter) {
        const af = assetFilter.toLowerCase();
        const assetStr = (t.assetId || t.symbol || '').toLowerCase();
        if (!assetStr.includes(af)) return false;
      }
      return true;
    });
  }, [txns, assetFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * pageSize;
  const pageEnd = Math.min(filtered.length, pageStart + pageSize);
  const pageItems = filtered.slice(pageStart, pageEnd);

  function exportCSV() {
    if (!filtered.length) return;
    const headers = ['date','action','asset','delta','after','source'];
    const lines = [headers.join(',')];
    for (const t of filtered) {
      const row = [
        formatDate(t.createdAt),
        t.action,
        t.assetId || t.symbol || '',
        (t.delta ?? '').toString(),
        (t.afterAmt ?? '').toString(),
        t.source || ''
      ].map(v => {
        const s = (v ?? '').toString();
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g,'""') + '"';
        }
        return s;
      }).join(',');
      lines.push(row);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  const loadingRows = Array.from({ length: 6 }).map((_,i) => (
    <tr key={i} role="row" className="animate-pulse">
      {Array.from({ length:6 }).map((__,j) => (
        <td role="cell" key={j} className="p-2 text-sm"><div className="h-4 bg-gray-200 rounded w-full" /></td>
      ))}
    </tr>
  ));

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-2 flex-1">
            <input
              value={assetFilter}
              onChange={e=>setAssetFilter(e.target.value)}
              placeholder="Filtrer par asset"
              className="md:flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring focus:ring-indigo-200"
            />
            <select
              value={actionFilter}
              onChange={e=>setActionFilter(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">Toutes actions</option>
              <option value="add_position">add_position</option>
              <option value="update_quantity">update_quantity</option>
              <option value="remove_position">remove_position</option>
              <option value="sell_percent">sell_percent</option>
              <option value="rebalance">rebalance</option>
              <option value="diversify">diversify</option>
            </select>
            <button
              onClick={exportCSV}
              className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 font-medium"
              disabled={!filtered.length}
            >Exporter CSV</button>
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap">{filtered.length} filtrées / {txns.length} total</div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            {filtered.length === 0 ? '0' : `${pageStart + 1}`}–{pageEnd} sur {filtered.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >Précédent</button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >Suivant</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">Erreur de chargement.</div>
      )}

      {isLoading && (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 font-medium">Date</th>
                <th className="p-2 font-medium">Action</th>
                <th className="p-2 font-medium">Asset</th>
                <th className="p-2 font-medium">Delta</th>
                <th className="p-2 font-medium">Après</th>
                <th className="p-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>{loadingRows}</tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && !filtered.length && (
        <div className="text-sm text-gray-500 italic">Aucune transaction.</div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table role="table" className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr role="row" className="border-b border-gray-200">
                <th scope="col" className="p-2 font-semibold">Date</th>
                <th scope="col" className="p-2 font-semibold">Action</th>
                <th scope="col" className="p-2 font-semibold">Asset</th>
                <th scope="col" className="p-2 font-semibold">Delta</th>
                <th scope="col" className="p-2 font-semibold">Après</th>
                <th scope="col" className="p-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t,i) => {
                const color = ACTION_COLORS[t.action] || 'bg-gray-100 text-gray-700';
                const deltaVal = t.delta ?? 0;
                const deltaClass = deltaVal>0 ? 'text-green-600' : deltaVal<0 ? 'text-red-600' : 'text-gray-600';
                return (
                  <tr role="row" key={i} className="border-b last:border-b-0 border-gray-100 hover:bg-gray-50 transition-colors">
                    <td role="cell" className="p-2 whitespace-nowrap font-mono text-xs text-gray-600">{formatDate(t.createdAt)}</td>
                    <td role="cell" className="p-2 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium tracking-wide ${color}`}>{t.action}</span>
                    </td>
                    <td role="cell" className="p-2 whitespace-nowrap font-mono text-xs">{t.assetId || t.symbol || ''}</td>
                    <td role="cell" className={`p-2 whitespace-nowrap font-mono text-xs ${deltaClass}`}>{deltaVal>0?'+':''}{formatNum(deltaVal)}</td>
                    <td role="cell" className="p-2 whitespace-nowrap font-mono text-xs text-gray-700">{formatNum(t.afterAmt)}</td>
                    <td role="cell" className="p-2 whitespace-nowrap text-xs text-gray-600">{t.source || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionsHistory;
