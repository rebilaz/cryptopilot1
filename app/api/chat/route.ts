// Simple chat endpoint integrating portfolio snapshot.
// Expects POST { messages: [{role,content}], portfolio?: { positions: [{symbol, quantity, valueUsd}], totalValue }
// If OPENAI_API_KEY present, forwards to OpenAI (small model suggested). Otherwise returns heuristic reply.
import { NextRequest } from 'next/server';
import { computeMetrics } from '@/lib/portfolio/metrics';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

function buildSystem(portfolio: any): ChatMessage {
  if (!portfolio) return { role: 'system', content: 'Tu es un assistant concis pour un mini portefeuille crypto. Réponds en français, style bref.' };
  const { positions = [], totalValue = 0 } = portfolio;
  const metrics = computeMetrics(positions.map((p: any)=> ({ symbol: p.symbol, quantity: p.quantity, valueUsd: p.valueUsd })));
  const lines = positions.map((p: any) => `${p.symbol}:${p.quantity}@${p.valueUsd?.toFixed?.(2)||0}`);
  const meta = `TV=${metrics.totalValue.toFixed(2)}$ | N=${metrics.positionsCount} | Max=${metrics.largestWeightPct.toFixed(1)}% | Stable=${metrics.stableWeightPct.toFixed(1)}% | DivScore=${metrics.diversificationScore.toFixed(0)}`;
  return {
    role: 'system',
    content: `Tu es un assistant concis pour analyser un portefeuille crypto. Format: phrases courtes, puces si utile. Donne avertissement si concentration >40% ou DivScore <50. Pas de conseils réglementés. ${meta}. Positions=${lines.join(', ')}`
  };
}

async function localHeuristic(messages: ChatMessage[]): Promise<string> {
  const last = messages.filter(m => m.role==='user').slice(-1)[0]?.content || '';
  if (/allocation|rebal/i.test(last)) return 'Rééquilibrage simple: vise <40% sur un seul actif et augmente l\'exposition aux actifs sous 10% si conviction.';
  if (/risque|risk/i.test(last)) return 'Risque principal: concentration & volatilité crypto. Diversifie et garde du stable si nécessaire.';
  return 'Portefeuille reçu. Pose une question précise (ex: "risque", "rééquilibrage", "analyse BTC").';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const portfolio = body.portfolio;
    const sys = buildSystem(portfolio);
    if (!OPENAI_API_KEY) {
      const answer = await localHeuristic([sys, ...messages]);
      return new Response(JSON.stringify({ reply: answer, provider: 'local' }), { status: 200 });
    }
    const payload = {
      model: MODEL,
      messages: [sys, ...messages],
      max_tokens: 220,
      temperature: 0.4,
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: 'upstream_error', detail: txt }), { status: 502 });
    }
    const json = await r.json();
    const reply = json.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ reply, provider: 'openai', model: MODEL }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'chat_error', message: e?.message || 'Unknown error' }), { status: 500 });
  }
}
