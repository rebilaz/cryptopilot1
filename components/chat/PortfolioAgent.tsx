"use client";
import React, { useState, useRef, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
// sync instance is now passed from parent to ensure single source of truth
import { toastSuccess, toastError } from '@/lib/toast';
import { TOKENS } from '@/lib/prices/tokens';
import { useSession } from 'next-auth/react';

interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string }

interface SyncLike {
  refetch: () => Promise<void>;
  merge?: (writes: any[]) => void;
  positions: any[];
  add?: (p: any) => Promise<void>;
  update?: (id: string, patch: any) => Promise<void>;
  remove?: (id: string) => Promise<void>;
}
interface PortfolioAgentProps {
  onToggleHistory?: () => void;
  sync: SyncLike;
}

export function PortfolioAgent({ onToggleHistory, sync }: PortfolioAgentProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([{
    role: 'system', content: 'Assistant portefeuille IA prêt. Donne une instruction (ex: "Passe ETH à 2", "Ajoute 100 USDC").'
  }]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<Array<{ op: string; symbol: string; amount?: number; percent?: number }> | null>(null);
  const [lastAction, setLastAction] = useState<any|null>(null);
  const [appliedTick, setAppliedTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any|null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  console.log('[chat-ui] using parent sync instance');
  const { status } = useSession();
  const isAuthed = status === 'authenticated';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, plan]);
  
  // --- Nouveau flux: envoi vers /api/chat avec placeholder assistant ---
  async function sendMessage(raw?: string) {
    const q = (raw ?? input).trim();
    if (!q || executing) return; // empêche double envoi
    setInput('');
    const userMsg: ChatMsg = { role: 'user', content: q };
    const placeholder: ChatMsg = { role: 'assistant', content: '…' };
    setMessages(m => [...m, userMsg, placeholder]);
    setExecuting(true); setError(null);
    const placeholderIndex = messages.length + 1; // après ajout user + placeholder (optimiste)
    try {
      console.log('[chat-ui] sending', { q });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: [...messages.filter(m=>m.role!=='system'), userMsg] })
      });
      const status = res.status;
      const headersObj: Record<string,string> = {};
      res.headers.forEach((v,k)=>{ headersObj[k]=v; });
      const textBody = await res.text();
      console.log('[chat-ui] response raw', { status, headers: headersObj, body: textBody });
      let json: any = null;
      try { json = JSON.parse(textBody); } catch (e) {
        console.warn('[chat-ui] JSON parse failed, using raw body');
      }
  console.log('[chat-ui] result:', json);
  console.log('[chat-ui] action:', json?.action, 'applied:', json?.applied, 'writes:', json?.writes?.length || 0);
      if (!res.ok) {
        const errTxt = json?.error || json?.message || textBody || `HTTP ${status}`;
        updateAssistant(placeholderIndex, `Désolé, erreur serveur: ${errTxt}`);
        toastError(errTxt);
        return;
      }
      // Construction du message assistant selon spec
      let replyText = json?.reply;
      if (!replyText && json?.action) {
        const a = json.action;
        const s = json?.args?.symbol ?? json?.symbol ?? '';
        const amt = json?.args?.amount ?? json?.amount;
        const pct = json?.args?.percent ?? json?.percent;
        if (a === 'add_position') replyText = `Ajouté ${amt} ${s}`;
        else if (a === 'update_quantity') replyText = `Quantité de ${s} = ${amt}`;
        else if (a === 'remove_position') replyText = `Supprimé ${s}`;
        else if (a === 'sell_percent') replyText = `Vendu ${pct}% de ${s}`;
        else if (a === 'rebalance') replyText = 'Rééquilibrage appliqué';
        else if (a === 'diversify') replyText = 'Diversification appliquée';
      }
      if (!replyText) replyText = 'Action traitée.';
      updateAssistant(placeholderIndex, replyText);

      // Refetch portefeuille si écriture
      const writeActions = new Set([
        'add_position','update_quantity','remove_position','sell_percent','rebalance','diversify'
      ]);
      const shouldRefetch =
        json?.applied === true ||
        (Array.isArray(json?.writes) && json.writes.length > 0) ||
        writeActions.has(json?.action);
      if (shouldRefetch) {
        console.log('[chat-ui] triggering parent sync.refetch()');
        try {
          await sync.refetch();
          startTransition(() => {
            try { router.refresh(); } catch {}
          });
        } catch (e:any) {
          console.error('[chat-ui] refetch error', e);
        }
        if (Array.isArray(json?.writes) && json.writes.length && typeof sync.merge === 'function') {
          sync.merge(json.writes);
        }
      }
    } catch (e:any) {
      console.error('[chat-ui] network error', e);
      updateAssistant(messages.length + 1, `Erreur réseau: ${e.message || 'inconnue'}`);
      toastError(e.message || 'Erreur réseau');
    } finally {
      setExecuting(false);
    }
  }

  // buildReplyFromContract plus utilisé (remplacé par logique inline)

  function updateAssistant(index: number, content: string) {
    setMessages(m => m.map((msg,i) => i===index ? { ...msg, content } : msg));
  }

  // ---- Action executor (client side) ----
  async function executeAction(a: any) {
    const act = String(a.action||'').toLowerCase();
    const symbol = (a.symbol||'').toUpperCase();
    try {
      if (!isAuthed) return; // live mode only
      if (act === 'add_position') {
        if (symbol && a.amount > 0 && typeof sync.add === 'function') {
          const meta = TOKENS.find(t => t.symbol.toUpperCase() === symbol);
          const assetId = meta ? meta.id : symbol.toLowerCase();
            await sync.add({ assetId, symbol, name: symbol, amount: a.amount });
            toastSuccess(`+${a.amount} ${symbol}`);
        }
      } else if (act === 'remove_position') {
        if (symbol && Array.isArray(sync.positions) && typeof sync.remove === 'function') {
          const pos = sync.positions.find(p => p.symbol.toUpperCase() === symbol);
          if (pos) { await sync.remove(pos.id); toastSuccess(`Removed ${symbol}`); }
        }
      } else if (act === 'update_quantity') {
        if (symbol && a.amount >= 0 && Array.isArray(sync.positions)) {
          const pos = sync.positions.find(p => p.symbol.toUpperCase() === symbol);
          if (pos && typeof sync.update === 'function') await sync.update(pos.id, { amount: a.amount });
          else if (typeof sync.add === 'function') {
            const meta = TOKENS.find(t => t.symbol.toUpperCase() === symbol);
            const assetId = meta ? meta.id : symbol.toLowerCase();
            await sync.add({ assetId, symbol, name: symbol, amount: a.amount });
          }
          toastSuccess(`${symbol} = ${a.amount}`);
        }
      } else if (act === 'sell_percent') {
        if (symbol && a.percent > 0 && Array.isArray(sync.positions)) {
          const pos = sync.positions.find(p => p.symbol.toUpperCase() === symbol);
          if (pos && typeof sync.update === 'function') {
            const newAmt = parseFloat((pos.amount * (1 - a.percent/100)).toFixed(8));
            await sync.update(pos.id, { amount: newAmt });
            toastSuccess(`Vendu ${a.percent}% ${symbol}`);
          }
        }
      } else if (act === 'rebalance') {
        if (a.target === 'equal_weight' && Array.isArray(sync.positions) && sync.positions.length > 1 && typeof sync.update === 'function') {
          const avg = sync.positions.reduce((s,p)=>s+p.amount,0)/sync.positions.length;
          for (const p of sync.positions) {
            await sync.update(p.id, { amount: parseFloat(avg.toFixed(8)) });
          }
          toastSuccess('Rééquilibrage OK');
        }
      }
      setAppliedTick(Date.now()); setTimeout(()=>setAppliedTick(0), 2500);
    } catch (e:any) {
      toastError(e.message || 'Action échouée');
    } finally {
      sync.refetch();
    }
  }

  // ---- Fallback regex (local) ----
  async function fallbackLocalExecution(raw: string) {
    const txt = raw.trim();
    const dec = (s:string)=>parseFloat(s.replace(/,/g,'.'));
    let m: RegExpExecArray|null;
    m = /^(?:ajoute|achete)\s+([\d.,]+)\s+([A-Za-z0-9\-]+)$/i.exec(txt); if (m) return executeAction({ action:'add_position', symbol:m[2].toUpperCase(), amount: dec(m[1]) });
    m = /^(?:mets|fixe)\s+([A-Za-z0-9\-]+)\s+à\s+([\d.,]+)$/i.exec(txt); if (m) return executeAction({ action:'update_quantity', symbol:m[1].toUpperCase(), amount: dec(m[2]) });
    m = /^(?:vends)\s+([\d.,]+)%\s+([A-Za-z0-9\-]+)$/i.exec(txt); if (m) return executeAction({ action:'sell_percent', symbol:m[2].toUpperCase(), percent: dec(m[1]) });
    m = /^(?:retire|supprime|vends)\s+(?:tout\s+)?([A-Za-z0-9\-]+)$/i.exec(txt); if (m) return executeAction({ action:'remove_position', symbol:m[1].toUpperCase() });
    if (/^rééquilibre|reequilibre|rebal/i.test(txt)) return executeAction({ action:'rebalance', target:'equal_weight' });
  }

  // Quick test buttons
  function quickSend(text: string) {
    setInput(text);
    setTimeout(() => { sendMessage(text); }, 0);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function sendJsonAction(obj: any) {
    const payload = JSON.stringify(obj);
    setInput(payload);
    setTimeout(()=>sendMessage(payload),0);
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-white flex flex-col h-96 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold text-neutral-700">
          <span>Agent Portefeuille IA</span>
          {appliedTick ? (
            <span className="inline-flex items-center rounded-full bg-emerald-600/10 text-emerald-700 text-xs px-2 py-0.5">Applied</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setShowDiag(d=>!d)} className="text-[10px] px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100">Diag</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto space-y-2 pr-1">
        {messages.map((m,i) => (
          <div key={i} className={m.role==='user' ? 'text-neutral-900' : m.role==='assistant' ? 'text-neutral-600 whitespace-pre-wrap' : 'text-neutral-500'}>
            <span className="font-semibold mr-1">{m.role==='user' ? 'Toi:' : m.role==='assistant' ? 'Bot:' : 'Sys:'}</span>{m.content}
          </div>
        ))}
        {plan && plan.length > 0 && (
          <div className="mt-2 border border-neutral-200 rounded p-2 bg-neutral-50 text-[11px]">
            <div className="font-medium mb-1">Plan:</div>
            <ul className="space-y-1">
              {plan.map((p,i)=>(
                <li key={i} className="flex justify-between">
                  <span>{p.op === 'set' ? `${p.symbol} = ${p.amount}` : p.op === '-' ? `Supprimer ${p.symbol}` : `+${p.amount} ${p.symbol}`}</span>
                  <span className="text-neutral-400">{p.op}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div ref={bottomRef} />
        {plan && plan.length > 0 && (
          <div className="mt-2 text-[10px] text-neutral-500">Plan exécuté (aperçu) — {plan.length} opération(s)</div>
        )}
        <div className="mt-3 space-x-2">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">Tests rapides:</span>
          <button onClick={()=>quickSend('Fixe ETH à 2')} className="text-[10px] px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100">ETH=2</button>
          <button onClick={()=>quickSend('Ajoute 1 SOL')} className="text-[10px] px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100">+1 SOL</button>
          <button onClick={()=>quickSend('Vends tout LINK')} className="text-[10px] px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100">- LINK</button>
        </div>
        {showDiag && debugInfo && (
          <div className="mt-3 border border-neutral-200 rounded p-2 bg-neutral-50 text-[10px] max-h-40 overflow-auto">
            <div className="font-semibold mb-1">Diagnostics</div>
            <ul className="space-y-0.5">
              <li>applied: {String(debugInfo?.applied)}</li>
              <li>plan.len: {plan?.length || 0}</li>
              <li>receivedMode: {String(debugInfo?.receivedMode)}</li>
              <li>doExecute: {String(debugInfo?.doExecute)}</li>
              <li>toolCalls: {debugInfo?.toolCalls?.length || 0}</li>
              <li>writes: {debugInfo?.writes?.length || 0}</li>
              {debugInfo?.errors?.length ? <li>errors:
                <ul className="list-disc ml-4">{debugInfo.errors.map((e:string,i:number)=>(<li key={i}>{e}</li>))}</ul>
              </li> : null}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
          placeholder={executing ? 'Réponse en cours...' : 'Ex: Passe ETH à 2, ajoute 100 USDC'}
          className="w-full h-20 resize-none rounded border border-neutral-300 bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
          disabled={executing}
        />
        <div className="flex flex-wrap gap-2 mt-2 mb-1">
          <button onClick={()=> onToggleHistory?.()} className="px-2 py-1 rounded border border-neutral-300 text-[10px] hover:bg-neutral-100">Historique</button>
          <button onClick={()=> sendJsonAction({ action: 'diversify' })} disabled={executing || !isAuthed} className="px-2 py-1 rounded border border-neutral-300 text-[10px] hover:bg-neutral-100 disabled:opacity-40">Diversifier</button>
          <button onClick={()=> sendJsonAction({ action: 'rebalance' })} disabled={executing || !isAuthed} className="px-2 py-1 rounded border border-neutral-300 text-[10px] hover:bg-neutral-100 disabled:opacity-40">Rééquilibrer</button>
          <button onClick={()=> sendJsonAction({ action: 'ask', question: 'valeur totale ?' })} disabled={executing || !isAuthed} className="px-2 py-1 rounded border border-neutral-300 text-[10px] hover:bg-neutral-100 disabled:opacity-40">Synthèse</button>
        </div>
        <div className="flex justify-between mt-1 items-center">
          <span className="text-[10px] text-neutral-500">Les réponses ne sont pas des conseils d'investissement.</span>
          <button onClick={()=>sendMessage()} disabled={executing || !input.trim() || !isAuthed} className="px-3 py-1 rounded bg-neutral-900 text-white text-[11px] font-medium disabled:opacity-40">
            {executing ? '...' : 'Envoyer'}
          </button>
        </div>
        {error && <div className="text-red-600 text-[11px] mt-1">{error}</div>}
        {!isAuthed && (
          <div className="text-[10px] text-red-500 mt-1">Connecte-toi pour exécuter des changements.</div>
        )}
      </div>
    </div>
  );
}

export default PortfolioAgent;
