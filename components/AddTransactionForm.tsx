"use client";
import React, { useState, useTransition } from 'react';
import { jsonFetch } from '@/lib/ui/fetcher';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/ui/format';

const TYPES = ['BUY','SELL','DEPOSIT','WITHDRAW','AIRDROP','FEE','ADJUST'] as const;

type Props = { assetId: string; defaultSymbol?: string | null; onCreated?: () => void };

export default function AddTransactionForm({ assetId, defaultSymbol, onCreated }: Props) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    type: 'BUY',
    quantity: '',
    unitPriceUsd: '',
    feeUsd: '',
    txTime: new Date().toISOString().slice(0,16), // local naive (YYYY-MM-DDTHH:mm)
    note: '',
    txHash: ''
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm(f => ({ ...f, [k]: v })); }

  function validate(): string | null {
    if (!form.quantity || Number(form.quantity) <= 0) return 'Quantité invalide';
    if (form.unitPriceUsd && Number(form.unitPriceUsd) <= 0) return 'Prix invalide';
    if (form.feeUsd && Number(form.feeUsd) < 0) return 'Fee invalide';
    if (!TYPES.includes(form.type as any)) return 'Type invalide';
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { push({ kind: 'error', text: err }); return; }
    startTransition(async () => {
      try {
        const body = {
          type: form.type,
          quantity: form.quantity,
          unitPriceUsd: form.unitPriceUsd || undefined,
          feeUsd: form.feeUsd || undefined,
          txTime: new Date(form.txTime).toISOString(),
          note: form.note || undefined,
          txHash: form.txHash || undefined
        };
        // TODO real endpoint
        await jsonFetch(`/api/portfolio/${assetId}/transactions`, { method: 'POST', body: JSON.stringify(body) });
        push({ kind: 'success', text: 'Transaction ajoutée' });
        setForm(f => ({ ...f, quantity: '', unitPriceUsd: '', feeUsd: '', note: '', txHash: '' }));
        onCreated?.();
      } catch (e:any) {
        push({ kind: 'error', text: e?.body?.error || e.message || 'Erreur ajout' });
      }
    });
  }

  return (
    <div className="rounded-2xl p-4 bg-slate-800/40 border border-slate-700/50 space-y-3">
      <div className="text-sm font-medium">Ajouter une transaction</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Type</label>
          <select value={form.type} onChange={e=>update('type', e.target.value)} className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 outline-none focus:border-slate-500">
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Quantité</label>
            <input value={form.quantity} onChange={e=>update('quantity', e.target.value)} placeholder="0.0" className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Prix USD</label>
            <input value={form.unitPriceUsd} onChange={e=>update('unitPriceUsd', e.target.value)} placeholder="20000" className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Fee USD</label>
            <input value={form.feeUsd} onChange={e=>update('feeUsd', e.target.value)} placeholder="0" className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
          <label className="text-xs uppercase text-slate-400">Date/heure</label>
            <input type="datetime-local" value={form.txTime} onChange={e=>update('txTime', e.target.value)} className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
          <label className="text-xs uppercase text-slate-400">Tx Hash</label>
            <input value={form.txHash} onChange={e=>update('txHash', e.target.value)} placeholder="0x..." className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
        <div className="flex flex-col gap-1 col-span-2 md:col-span-4">
          <label className="text-xs uppercase text-slate-400">Note</label>
            <input value={form.note} onChange={e=>update('note', e.target.value)} placeholder="Commentaire" className="bg-slate-900 rounded-xl px-2 py-2 border border-slate-700 focus:border-slate-500 outline-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={pending} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:opacity-90 disabled:opacity-50 text-sm font-medium shadow">
          {pending ? 'En cours...' : 'Ajouter'}
        </button>
        <button onClick={()=>setForm(f=>({ ...f, quantity:'', unitPriceUsd:'', feeUsd:'', note:'', txHash:'' }))} type="button" className="px-4 py-2 rounded-2xl bg-slate-700 hover:opacity-80 text-sm font-medium">
          Reset
        </button>
      </div>
    </div>
  );
}
