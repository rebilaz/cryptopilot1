import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-auth getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'u1', email: 't@t' } })),
}));

let createCall = 0;
// Mock OpenAI client (single definition)
vi.mock('openai', () => {
  class OpenAI {
    responses = {
      create: vi.fn(async (_args: any) => {
        createCall++;
        if (createCall === 1) {
          return {
            output: [{
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: 'OK' }],
              tool_calls: [{
                type: 'function',
                name: 'set_quantity',
                function: { arguments: JSON.stringify({ symbol: 'ETH', amount: 2 }) }
              }]
            }]
          } as any;
        }
        return {
          output: [{
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Done' }],
          }]
        } as any;
      })
    };
  }
  return { default: OpenAI };
});

// Tool stubs
const setQuantityMock = vi.fn(async () => ({ ok: true, data: { id: 'p1', symbol: 'ETH', amount: 2 } }));
const getPortfolioMock = vi.fn(async () => ({ ok: true, data: { positions: [] } }));
vi.mock('@/lib/ai-tools/portfolio', () => ({
  setQuantity: () => setQuantityMock(),
  addPosition: async () => ({ ok: true, data: {} }),
  removePosition: async () => ({ ok: true, data: {} }),
  getPortfolio: () => getPortfolioMock(),
}));

import { POST as routePOST } from '@/app/api/ai/portfolio/route';

const mkReq = (body: any) => new Request('http://local/api/ai/portfolio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}) as any;

beforeEach(() => { createCall = 0; setQuantityMock.mockClear(); getPortfolioMock.mockClear(); });

describe('ai/portfolio route', () => {
  it('dry-run => applied:false + plan', async () => {
    const res = await routePOST(mkReq({
      messages: [{ role: 'user', content: 'Fixe ETH à 2' }],
      mode: 'dry-run'
    } as any));
    const json: any = await res.json();
    expect(json.applied).toBe(false);
    expect(Array.isArray(json.plan)).toBe(true);
    expect(setQuantityMock).toHaveBeenCalledTimes(0);
  });

  it('execute => applied:true + tool set_quantity appelé', async () => {
    const res = await routePOST(mkReq({
      messages: [{ role: 'user', content: 'Fixe ETH à 2' }],
      mode: 'execute'
    } as any));
    const json: any = await res.json();
    expect(json.applied).toBe(true);
    expect(setQuantityMock).toHaveBeenCalledTimes(1);
  });
});
