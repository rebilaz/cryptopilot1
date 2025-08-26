import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Legacy ai-tools functions (still used maybe in other paths) replaced here by service layer
import { addPosition as addPosSvc, setQuantity as setQtySvc, removePosition as removePosSvc, sellPercent as sellPctSvc, rebalancePortfolio as rebalanceSvc, diversifyPortfolio as diversifySvc, answerQuestion as answerSvc } from '@/lib/portfolioService';
import { prisma } from '@/lib/prisma';
import { TOKENS } from '@/lib/prices/tokens';
import { normalizeAsset as sharedNormalizeAsset } from '@/lib/prices/normalizeAsset';
import { computeMetrics } from '@/lib/portfolio/metrics';
import { z } from 'zod';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

function systemMessage(): ChatMessage {
  return {
    role: 'system',
    content: [
      'Tu es un assistant de gestion de portefeuille.',
      'Réponds UNIQUEMENT en JSON STRICT valide sans texte hors JSON.',
      'Schéma exact:',
      '{ "action": "add_position" | "update_quantity" | "remove_position" | "sell_percent" | "rebalance" | "diversify" | "ask", "symbol"?: string, "amount"?: number, "percent"?: number, "target"?: string, "question"?: string }',
      'Actions autorisées UNIQUEMENT (canonicales): add_position, update_quantity, remove_position, sell_percent, rebalance, diversify, ask.',
      'N\'utilise JAMAIS d\'autres alias en sortie (le serveur mappe les alias).',
      'Si commande ambiguë: {"action":"rebalance","target":"noop"}.',
      'Exemples:',
      '{"action":"diversify"}',
      '{"action":"remove_position","symbol":"SOL"}',
      '{"action":"ask","question":"ma concentration ETH ?"}',
      '{"action":"rebalance"}',
      '{"action":"update_quantity","symbol":"SOL","amount":2.5}',
      '{"action":"add_position","symbol":"AIOZ","amount":1}'
    ].join('\n')
  };
}

// Canonical action schema (post-normalisation)
const ActionSchema = z.object({
  action: z.enum(['add_position','update_quantity','remove_position','sell_percent','rebalance','diversify','ask']),
  symbol: z.string().optional(),
  amount: z.number().optional(),
  percent: z.number().optional(),
  target: z.string().optional(),
  question: z.string().optional()
});

type CanonicalAction = z.infer<typeof ActionSchema>;

function normalizeAction(raw: string): CanonicalAction['action'] | null {
  if (!raw) return null;
  const a = raw.trim().toLowerCase();
  const map: Record<string, CanonicalAction['action']> = {
    // add
    'add_position':'add_position','add':'add_position','buy':'add_position','+':'add_position','ajoute':'add_position',
    // update
    'update_quantity':'update_quantity','set':'update_quantity','update':'update_quantity','=':'update_quantity','fixe':'update_quantity','mets':'update_quantity',
    // remove
    'remove_position':'remove_position','remove':'remove_position','delete':'remove_position','rm':'remove_position','retire':'remove_position','supprime':'remove_position','enleve':'remove_position',
    // sell percent
    'sell_percent':'sell_percent','sell':'sell_percent','vends':'sell_percent',
    // rebalance
    'rebalance':'rebalance','balance':'rebalance','rééquilibre':'rebalance','reequilibre':'rebalance','rebal':'rebalance',
    // diversify
    'diversify':'diversify','diversifie':'diversify',
    // ask / question
    'ask':'ask','question':'ask','analyse':'ask','synthèse':'ask','synthese':'ask'
  };
  return map[a] || null;
}

const normalizeAsset = sharedNormalizeAsset;

function fallbackParse(raw: string) {
  const txt = (raw||'').trim();
  const dec = (s:string)=>parseFloat(s.replace(/,/g,'.'));
  let m:RegExpExecArray|null;
  m = /^(?:ajoute|achete)\s+([\d.,]+)\s+([A-Za-z0-9\-]+)$/i.exec(txt); if (m){ const amt=dec(m[1]); const sym=m[2].toUpperCase(); if(isFinite(amt)&&amt>0) return {action:'add_position',symbol:sym,amount:amt}; }
  m = /^(?:mets|fixe)\s+([A-Za-z0-9\-]+)\s+à\s+([\d.,]+)$/i.exec(txt); if (m){ const sym=m[1].toUpperCase(); const amt=dec(m[2]); if(isFinite(amt)&&amt>=0) return {action:'update_quantity',symbol:sym,amount:amt}; }
  m = /^(?:vends)\s+([\d.,]+)%\s+([A-Za-z0-9\-]+)$/i.exec(txt); if (m){ const pct=dec(m[1]); const sym=m[2].toUpperCase(); if(isFinite(pct)&&pct>0&&pct<=100) return {action:'sell_percent',symbol:sym,percent:pct}; }
  m = /^(?:retire|supprime|vends)\s+(?:tout\s+)?([A-Za-z0-9\-]+)$/i.exec(txt); if (m){ const sym=m[1].toUpperCase(); return {action:'remove_position',symbol:sym}; }
  if (/^rééquilibre|reequilibre|rebal/i.test(txt)) return {action:'rebalance',target:'equal_weight'};
  return {action:'rebalance',target:'noop'};
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const userId = session?.user?.id as string | undefined;
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const sys = systemMessage();
  let parsed: any = null; let rawModel = '';
    if (!OPENAI_API_KEY) {
      parsed = fallbackParse(messages.filter(m=>m.role==='user').slice(-1)[0]?.content || '');
    } else {
      const payload = { model: MODEL, messages: [sys, ...messages], max_tokens: 120, temperature: 0 };
      const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const txt = await r.text();
        return new Response(JSON.stringify({ error: 'upstream_error', detail: txt }), { status: 502 });
      }
      const completion = await r.json();
      rawModel = completion.choices?.[0]?.message?.content || '';
  console.log('[chat] raw GPT response:', rawModel);
      try { parsed = JSON.parse(rawModel || '{}'); } catch { parsed = null; }
  console.log('[chat] parsed JSON:', parsed);
      // Normalisation action si parse OK
      if (parsed && typeof parsed === 'object') {
        parsed.action = normalizeAction(parsed.action) || parsed.action;
      }
  console.log('[chat] normalized action:', parsed?.action);
      if (!parsed || typeof parsed !== 'object' || !normalizeAction(parsed.action)) {
        parsed = fallbackParse(messages.filter(m=>m.role==='user').slice(-1)[0]?.content || '');
      }
    }

  // Service layer now handles all portfolio operations (with BigQuery logging)

    // Validation stricte
    try {
  const validated = ActionSchema.parse({
        action: normalizeAction(parsed.action) || 'rebalance',
        symbol: parsed.symbol,
        amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
        percent: typeof parsed.percent === 'number' ? parsed.percent : undefined,
        target: parsed.target,
        question: parsed.question
      });
  // Normalisation asset (symbol/id) pour opérations nécessitant un symbole
  const assetId = validated.symbol ? normalizeAsset(validated.symbol) : '';
  console.log('[chat] normalized args:', { action: validated.action, symbol: validated.symbol, assetId, amount: validated.amount, percent: validated.percent, target: validated.target, question: validated.question });

  let reply: string | undefined;
  let writes: any[] | undefined;
  let applied = false;
      switch (validated.action) {
        case 'add_position': {
          if (assetId && (validated.amount ?? 0) > 0) {
            const r = await addPosSvc(userId, { assetId, amount: validated.amount, source: 'chat' });
            if (r.ok) { applied = true; writes = r.writes; }
          }
          break; }
        case 'update_quantity': {
          if (assetId && (validated.amount ?? -1) >= 0) {
            const r = await setQtySvc(userId, assetId, validated.amount, 'chat');
            if (r.ok) { applied = true; writes = r.writes; }
          }
          break; }
        case 'remove_position': {
          if (assetId) {
            const r = await removePosSvc(userId, assetId, 'chat');
            if (r.ok) { applied = true; writes = r.writes; }
          }
          break; }
        case 'sell_percent': {
          if (assetId && (validated.percent ?? 0) > 0) {
            const r = await sellPctSvc(userId, assetId, validated.percent!, 'chat');
            if (r.ok) { applied = true; writes = r.writes; }
          }
          break; }
        case 'rebalance': {
          const r = await rebalanceSvc(userId, 'equal_weight', { tolerance: 0.01 }, 'chat');
          if (r.ok) { applied = true; writes = r.writes; reply = r.data?.reply; }
          break; }
        case 'diversify': {
            const r = await diversifySvc(userId, {}, 'chat');
            if (r.ok) { writes = r.writes; reply = r.data?.reply; applied = (writes?.length||0) > 0; }
            break; }
        case 'ask': {
          const r = await answerSvc(userId, validated.question || validated.target || '');
          reply = r.reply; applied = false; break; }
      }
      const writeActions = new Set(['add_position','update_quantity','remove_position','sell_percent','rebalance','diversify']);
      if (validated.action === 'ask') {
        return Response.json({ applied: false, reply }, { headers: { 'Cache-Control': 'no-store' } });
      }
      // Construit writes minimal si service n'a rien renvoyé
      if (!writes && writeActions.has(validated.action)) {
        writes = [];
      }
      console.log('[chat] writes length:', writes?.length ?? 0);
      for (const w of (writes||[])) {
        console.log('[chat] write', { assetId: w.assetId, beforeAmt: w.beforeAmt, afterAmt: w.afterAmt, delta: w.delta });
      }
      return Response.json(
        { applied: true, action: validated.action, args: { ...validated, assetId }, writes },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (e:any) {
      console.error('action_error', e);
      return new Response(JSON.stringify({ applied: false, action: parsed?.action, args: parsed, error: 'action_failed_validation' }), { status: 200 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'chat_error', message: e?.message || 'Unknown error' }), { status: 500 });
  }
}
