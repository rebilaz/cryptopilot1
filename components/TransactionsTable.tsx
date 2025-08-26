"use client";
import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { jsonFetch } from '@/lib/ui/fetcher';
import { formatDate, formatQty, formatUsd } from '@/lib/ui/format';
import { useToast } from '@/components/ui/Toast';
import { TransactionItemDTO, TransactionsPageDTO, TxType } from '@/types/transactions';

interface TransactionsTableProps {
  assetId: string;
  initialPage: TransactionsPageDTO;
}

interface Filters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  dir: 'asc'|'desc';
}

const TYPE_OPTIONS: TxType[] = ['BUY','SELL','DEPOSIT','WITHDRAW','AIRDROP','FEE','ADJUST'];

export default function TransactionsTable({ assetId, initialPage }: TransactionsTableProps) {
  const { push } = useToast();
  const [page, setPage] = useState<TransactionsPageDTO>(initialPage);
  const [loading, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>({ dir: 'desc' });
  const [cursor, setCursor] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPage = useCallback((opts: { direction?: 'next'|'prev'; reset?: boolean } = {}) => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (cursor && !opts.reset) params.set('cursor', cursor);
        params.set('dir', filters.dir);
        if (filters.type) params.set('type', filters.type);
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        if (filters.q) params.set('q', filters.q);
        params.set('limit', '50');
        params.set('sort', 'txTime');
        if (opts.direction === 'next' && page.nextCursor) params.set('cursor', page.nextCursor);
        if (opts.direction === 'prev' && page.prevCursor) params.set('cursor', page.prevCursor);
        const url = `/api/portfolio/${assetId}/transactions?` + params.toString();
        const res = await jsonFetch<any>(url);
        setPage(res.page || { items: [] });
        if (opts.reset) setCursor(null);
      } catch (e:any) {
        push({ kind: 'error', text: e?.body?.error || 'Erreur chargement' });
      }
    });
  }, [assetId, cursor, filters, page.nextCursor, page.prevCursor, push]);

  function applyFilters(partial: Partial<Filters>) {
    setFilters(f => ({ ...f, ...partial }));
  }

  useEffect(() => {
    fetchPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.dateFrom, filters.dateTo, filters.q, filters.dir]);

  function openEdit(t: TransactionItemDTO) {
    setEditId(t.id);
    setEditDraft({ ...t });
  }

  async function saveEdit() {
    startTransition(async () => {
      try {
        const body: any = { ...editDraft };
        // normalize
        body.quantity = editDraft.quantity;
        if (!body.quantity || Number(body.quantity) <= 0) throw new Error('Quantité invalide');
        await jsonFetch(`/api/transactions/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
        push({ kind: 'success', text: 'Transaction mise à jour' });
        setEditId(null); setEditDraft({});
        fetchPage();
      } catch (e:any) {
        push({ kind: 'error', text: e?.body?.error || e.message || 'Erreur maj' });
      }
    });
  }

  async function deleteOne(id: string) {
    if (!confirm('Supprimer cette transaction ?')) return;
    startTransition(async () => {
      try {
        await jsonFetch(`/api/transactions/${id}`, { method: 'DELETE' });
        push({ kind: 'success', text: 'Supprimé' });
        fetchPage();
      } catch (e:any) {
        push({ kind: 'error', text: e?.body?.error || 'Erreur suppression' });
      }
    });
  }

  const mobile = typeof window !== 'undefined' && window.innerWidth < 768;

  function subtotal(t: TransactionItemDTO): string {
    const qty = Number(t.quantity);
    const price = t.unitPriceUsd ? Number(t.unitPriceUsd) : 0;
    return qty && price ? formatUsd(qty * price) : '—';
  }

  const content = (
    <>
      {page.items.length === 0 && !loading && (
        <div className="text-sm text-slate-400 p-4">Aucune transaction.</div>
      )}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr className="text-left border-b border-slate-700/60">
              <th className="py-2 cursor-pointer" onClick={()=>applyFilters({ dir: filters.dir === 'desc' ? 'asc':'desc' })}>Date {filters.dir==='desc'?'↓':'↑'}</th>
              <th className="py-2">Type</th>
              <th className="py-2">Quantité</th>
              <th className="py-2">Prix</th>
              <th className="py-2">Fee</th>
              <th className="py-2">Subtotal</th>
              <th className="py-2">Note</th>
              <th className="py-2">Tx Hash</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map(t => {
              const editing = editId === t.id;
              return (
                <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="py-2 align-top whitespace-nowrap">{formatDate(t.txTime)}</td>
                  <td className="py-2 align-top font-medium">{t.type}</td>
                  <td className="py-2 align-top tabular-nums">
                    {editing ? (
                      <input value={editDraft.quantity} onChange={e=>setEditDraft((d:any)=>({...d, quantity: e.target.value}))} className="bg-slate-900 rounded px-2 py-1 w-24 border border-slate-600" />
                    ) : formatQty(t.quantity)}
                  </td>
                  <td className="py-2 align-top tabular-nums">{t.unitPriceUsd ? formatUsd(t.unitPriceUsd) : '—'}</td>
                  <td className="py-2 align-top tabular-nums">{t.feeUsd ? formatUsd(t.feeUsd) : '—'}</td>
                  <td className="py-2 align-top tabular-nums">{subtotal(t)}</td>
                  <td className="py-2 align-top max-w-[180px] truncate" title={t.note}>{t.note || '—'}</td>
                  <td className="py-2 align-top max-w-[160px] truncate" title={t.txHash}>{t.txHash || '—'}</td>
                  <td className="py-2 align-top flex gap-2">
                    {editing ? (
                      <>
                        <button onClick={saveEdit} className="px-2 py-1 bg-emerald-600 rounded-xl text-xs hover:opacity-90">Save</button>
                        <button onClick={()=>{ setEditId(null); setEditDraft({}); }} className="px-2 py-1 bg-slate-600 rounded-xl text-xs hover:opacity-80">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>openEdit(t)} className="px-2 py-1 bg-slate-700 rounded-xl text-xs hover:opacity-80" aria-label="Editer">Edit</button>
                        <button onClick={()=>deleteOne(t.id)} className="px-2 py-1 bg-red-600 rounded-xl text-xs hover:opacity-90" aria-label="Supprimer">Del</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {page.items.map(t => {
          const editing = editId === t.id;
          return (
            <div key={t.id} className="rounded-xl p-3 bg-slate-800/40 border border-slate-700/50 text-xs flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="font-semibold">{t.type}</span>
                <span>{formatDate(t.txTime)}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <span>Qty: {editing ? <input value={editDraft.quantity} onChange={e=>setEditDraft((d:any)=>({...d, quantity: e.target.value}))} className="bg-slate-900 rounded px-1 py-0.5 w-20 border border-slate-600" /> : formatQty(t.quantity)}</span>
                <span>Prix: {t.unitPriceUsd ? formatUsd(t.unitPriceUsd) : '—'}</span>
                <span>Fee: {t.feeUsd ? formatUsd(t.feeUsd) : '—'}</span>
                <span>Sub: {subtotal(t)}</span>
              </div>
              {t.note && <div className="text-slate-400 truncate">{t.note}</div>}
              {t.txHash && <div className="text-slate-500 truncate">{t.txHash}</div>}
              <div className="flex gap-2 pt-1">
                {editing ? (
                  <>
                    <button onClick={saveEdit} className="px-2 py-1 bg-emerald-600 rounded-lg text-[10px]">Save</button>
                    <button onClick={()=>{ setEditId(null); setEditDraft({}); }} className="px-2 py-1 bg-slate-600 rounded-lg text-[10px]">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>openEdit(t)} className="px-2 py-1 bg-slate-700 rounded-lg text-[10px]">Edit</button>
                    <button onClick={()=>deleteOne(t.id)} className="px-2 py-1 bg-red-600 rounded-lg text-[10px]">Del</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="rounded-2xl p-4 bg-slate-800/30 border border-slate-700/50 space-y-4">
      <div className="flex flex-wrap gap-3 items-end text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-slate-400">Type</label>
          <select value={filters.type||''} onChange={e=>applyFilters({ type: e.target.value || undefined })} className="bg-slate-900 rounded-xl px-2 py-1.5 border border-slate-700 focus:border-slate-500 outline-none">
            <option value="">Tous</option>
            {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-slate-400">Date de</label>
          <input type="date" value={filters.dateFrom||''} onChange={e=>applyFilters({ dateFrom: e.target.value||undefined })} className="bg-slate-900 rounded-xl px-2 py-1.5 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-slate-400">à</label>
          <input type="date" value={filters.dateTo||''} onChange={e=>applyFilters({ dateTo: e.target.value||undefined })} className="bg-slate-900 rounded-xl px-2 py-1.5 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-[10px] uppercase text-slate-400">Recherche</label>
          <input placeholder="note ou hash" value={filters.q||''} onChange={e=>applyFilters({ q: e.target.value||undefined })} className="bg-slate-900 rounded-xl px-2 py-1.5 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={()=>fetchPage({ direction: 'prev' })} disabled={!page.prevCursor || loading} className="px-3 py-1.5 rounded-xl bg-slate-700 disabled:opacity-40 hover:opacity-80">Prev</button>
          <button onClick={()=>fetchPage({ direction: 'next' })} disabled={!page.nextCursor || loading} className="px-3 py-1.5 rounded-xl bg-slate-700 disabled:opacity-40 hover:opacity-80">Next</button>
        </div>
      </div>
      {loading && <div className="text-xs text-slate-400">Chargement...</div>}
      {content}
    </div>
  );
}
