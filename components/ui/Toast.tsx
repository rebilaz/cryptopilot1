"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastMsg = { id: string; kind?: 'info'|'success'|'error'; text: string; ttl?: number };

interface ToastCtx {
  push: (msg: Omit<ToastMsg,'id'>) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const push = useCallback((m: Omit<ToastMsg,'id'>) => {
    const id = crypto.randomUUID();
    const toast: ToastMsg = { id, kind: 'info', ttl: 4000, ...m };
    setItems(list => list.concat(toast));
    setTimeout(() => setItems(list => list.filter(i => i.id !== id)), toast.ttl);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {items.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-xl shadow text-sm backdrop-blur bg-slate-800/80 border ${t.kind==='error' ? 'border-red-500/50 text-red-300' : t.kind==='success' ? 'border-emerald-500/50 text-emerald-300' : 'border-slate-600/50 text-slate-200'}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}
