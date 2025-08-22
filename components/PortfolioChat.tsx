"use client";
import { useState, useRef, useEffect } from 'react';
import { computeMetrics } from '@/lib/portfolio/metrics';

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface Props {
  snapshot: { positions: { symbol: string; quantity: number; valueUsd: number }[]; totalValue: number };
}

export function PortfolioChat({ snapshot }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant', content: 'Assistant portefeuille prêt. Demande: "risque", "rééquilibrage", ou tape ta question.'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(m => [...m, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: q }],
          portfolio: snapshot
        })
      });
      const json = await res.json();
      const reply = json.reply || '(pas de réponse)';
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erreur: ' + (e?.message || 'inconnue') }]);
    } finally { setLoading(false); }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const metrics = computeMetrics(snapshot.positions);
  return (
    <div className="border border-neutral-200 rounded-lg p-3 bg-white flex flex-col h-96">
      <div className="text-[11px] mb-2 text-neutral-500 font-medium">Chat Portefeuille</div>
      <div className="grid grid-cols-3 gap-1 mb-2 text-[10px] text-neutral-600">
        <div className="border border-neutral-200 rounded px-2 py-1">Max {metrics.largestWeightPct.toFixed(1)}%</div>
        <div className="border border-neutral-200 rounded px-2 py-1">Div {metrics.diversificationScore.toFixed(0)}</div>
        <div className={`border border-neutral-200 rounded px-2 py-1 ${metrics.concentrationFlag ? 'text-red-600' : ''}`}>{metrics.concentrationFlag ? 'Concentration' : 'OK'}</div>
      </div>
      <div className="flex-1 overflow-auto space-y-2 pr-1 text-[11px] leading-relaxed">
        {messages.map((m,i) => (
          <div key={i} className={m.role==='user' ? 'text-neutral-900' : 'text-neutral-600'}>
            <span className="font-semibold mr-1">{m.role==='user' ? 'Toi:' : 'Bot:'}</span>{m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {['risque','rééquilibrage','synthèse','diversification'].map(q => (
          <button key={q} onClick={()=>{ setInput(q); setTimeout(()=>send(),0); }} className="px-2 py-1 rounded border border-neutral-300 text-[10px] hover:bg-neutral-100">
            {q}
          </button>
        ))}
      </div>
      <div className="mt-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={loading ? 'Réponse en cours...' : 'Pose une question...'}
          className="w-full h-16 resize-none rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-neutral-900/30"
          disabled={loading}
        />
        <div className="flex justify-end mt-1">
          <button onClick={send} disabled={loading || !input.trim()} className="px-3 py-1 rounded bg-neutral-900 text-white text-[11px] font-medium disabled:opacity-40">Envoyer</button>
        </div>
      </div>
    </div>
  );
}

export default PortfolioChat;
