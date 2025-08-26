import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOpenAI } from '@/lib/openai';
import { getPortfolio } from '@/lib/ai-tools/portfolio';

export const runtime = 'nodejs';

interface ChatBody { messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; mode?: any }

const SYSTEM_PROMPT = `Tu es un traducteur d'instructions de portefeuille vers JSON STRICT.
Tu dois répondre uniquement par un objet JSON (aucun texte additionnel) respectant:
{
  "action": "add_position" | "remove_position" | "update_quantity" | "sell_percent" | "rebalance",
  "symbol": string (optionnel),
  "amount": number (optionnel),
  "percent": number (optionnel),
  "target": string (optionnel)
}
Règles:
1 add_position => symbol & amount (>0)
2 remove_position => symbol
3 update_quantity => symbol & amount (>=0)
4 sell_percent => symbol & percent (0<percent<=100)
5 rebalance => target (ex: "equal_weight")
6 Si ambigu ou impossible: {"action":"rebalance","target":"noop"}
7 Décimales: virgule = point.
Exemples:
"ajoute 1 AIOZ" => {"action":"add_position","symbol":"AIOZ","amount":1}
"retire ETH" => {"action":"remove_position","symbol":"ETH"}
"mets 2.5 SOL" => {"action":"update_quantity","symbol":"SOL","amount":2.5}
"vends 10% ETH" => {"action":"sell_percent","symbol":"ETH","percent":10}
"rééquilibre" => {"action":"rebalance","target":"equal_weight"}
Répond UNIQUEMENT ce JSON.`;

function openAIModel() { return process.env.OPENAI_MODEL || 'gpt-4o-mini'; }

// Simple in-memory rate limiter: 10 req / 60s per user (or IP fallback)
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;
type Bucket = { times: number[] };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) { b = { times: [] }; buckets.set(key, b); }
  // purge old
  b.times = b.times.filter(t => now - t < RL_WINDOW_MS);
  if (b.times.length >= RL_MAX) {
    return { allowed: false, remaining: 0 };
  }
  b.times.push(now);
  return { allowed: true, remaining: Math.max(0, RL_MAX - b.times.length) };
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user || !session.user.id) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const userId = session.user.id as string;

    // Rate limit
    const rl = rateLimit('u:' + userId);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'X-RateLimit-Remaining': '0' } });
    }
  const body: ChatBody = await req.json();
  const rawMode = body?.mode;
  const wantDebug = req.headers.get('x-debug') === '1' || new URL(req.url).searchParams.get('diag') === '1';
  const debug = { receivedMode: rawMode, errors: [] as string[], parsing: {} as any };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];

    const client = getOpenAI();

  const lastUser = messages.filter(m=>m.role==='user').slice(-1);
  const convo: any[] = [ { role: 'system', content: SYSTEM_PROMPT }, ...lastUser.map(m => ({ role: 'user', content: m.content })) ];

    // Fallback direct JSON via regex simplifiée
    function fallbackToJSON(msg: string) {
      const dec = (s:string)=>parseFloat(s.replace(/,/g,'.'));
      const t = msg.trim();
      let m:RegExpExecArray|null;
      m = /^(?:ajoute|achete)\s+([\d.,]+)\s+([A-Za-z0-9\-]+)$/i.exec(t); if (m){ const amt=dec(m[1]); const sym=m[2].toUpperCase(); if(isFinite(amt)&&amt>0) return {action:'add_position',symbol:sym,amount:amt}; }
      m = /^(?:mets|fixe)\s+([A-Za-z0-9\-]+)\s+à\s+([\d.,]+)$/i.exec(t); if (m){ const sym=m[1].toUpperCase(); const amt=dec(m[2]); if(isFinite(amt)&&amt>=0) return {action:'update_quantity',symbol:sym,amount:amt}; }
      m = /^(?:vends)\s+([\d.,]+)%\s+([A-Za-z0-9\-]+)$/i.exec(t); if (m){ const pct=dec(m[1]); const sym=m[2].toUpperCase(); if(isFinite(pct)&&pct>0&&pct<=100) return {action:'sell_percent',symbol:sym,percent:pct}; }
      m = /^(?:retire|supprime|vends)\s+(?:tout\s+)?([A-Za-z0-9\-]+)$/i.exec(t); if (m){ const sym=m[1].toUpperCase(); return {action:'remove_position',symbol:sym}; }
      if (/^rééquilibre|reequilibre|rebal/i.test(t)) return {action:'rebalance',target:'equal_weight'};
      return {action:'rebalance',target:'noop'};
    }

    async function applyOfflineFallback(): Promise<Response> {
      const last = messages.filter(m=>m.role==='user').slice(-1)[0];
      const json = fallbackToJSON(last?.content || '');
      debug.errors.push('fallback_offline_used');
      return new Response(JSON.stringify({ reply: JSON.stringify(json), applied: false, ...(wantDebug?{debug}:{}) }), { status: 200 });
    }

    // Single roundtrip expecting pure JSON
    let response: any;
    try {
      response = await client.responses.create({ model: openAIModel(), input: convo.map(m => ({ role: m.role, content: m.content })) } as any);
    } catch (e:any) {
      debug.errors.push(e.message || 'openai_error');
      return await applyOfflineFallback();
    }
    let textPart = '';
    if (Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item.type === 'message') {
          const msg = item as any;
          if (Array.isArray(msg.content)) {
            const textChunk = msg.content.find((c: any) => c.type === 'output_text' || c.type === 'text');
            if (textChunk?.text) textPart += textChunk.text;
          }
        } else if (item.type === 'output_text' && (item as any).text) {
          textPart += (item as any).text;
        }
      }
    }
    if (!textPart && (response as any).output_text) textPart = (response as any).output_text;
    const raw = textPart.trim();
    let parsed:any = null;
    try { parsed = JSON.parse(raw); } catch { debug.errors.push('parse_error'); }
    if (!parsed || typeof parsed !== 'object' || !parsed.action) {
      return await applyOfflineFallback();
    }
    debug.parsing = { ok: true, action: parsed.action };
    return new Response(JSON.stringify({ reply: JSON.stringify(parsed), applied: false, ...(wantDebug?{debug}:{}) }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'ai_portfolio_error', message: e?.message || 'unknown' }), { status: 500 });
  }
}
