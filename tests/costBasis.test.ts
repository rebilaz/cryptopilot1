import { describe, it, expect } from 'vitest';
import { processTransactions, evaluate } from '@/lib/ledger/costBasis';

describe('costBasis', () => {
  it('computes weighted average and realized pnl', () => {
    const txns = [
      { id: '1', assetId: 'bitcoin', type: 'BUY' as const, quantity: 1, price: 20000, createdAt: new Date('2024-01-01') },
      { id: '2', assetId: 'bitcoin', type: 'BUY' as const, quantity: 1, price: 30000, createdAt: new Date('2024-02-01') },
      { id: '3', assetId: 'bitcoin', type: 'SELL' as const, quantity: 0.5, price: 40000, createdAt: new Date('2024-03-01') },
    ];
    const state = processTransactions('bitcoin', txns);
    // After buys: avgCost = (1*20000 + 1*30000)/2 = 25000, qty 2
    // After sell 0.5 at 40000: realized = (40000-25000)*0.5 = 7500, qty 1.5, avgCost stays 25000
    expect(state.totalQuantity).toBeCloseTo(1.5);
    expect(state.avgCost).toBeCloseTo(25000);
    expect(state.realizedPnl).toBeCloseTo(7500);
  });

  it('handles fee reducing quantity', () => {
    const txns = [
      { id: '1', assetId: 'eth', type: 'BUY' as const, quantity: 10, price: 1000, createdAt: new Date() },
      { id: '2', assetId: 'eth', type: 'FEE' as const, quantity: 0.1, price: 1000, createdAt: new Date() },
    ];
    const state = processTransactions('eth', txns);
    expect(state.totalQuantity).toBeCloseTo(9.9);
    expect(state.fees).toBeCloseTo(100); // 0.1*1000
  });

  it('evaluate computes unrealized', () => {
    const txns = [
      { id: '1', assetId: 'btc', type: 'BUY' as const, quantity: 1, price: 10000, createdAt: new Date() },
    ];
    const evald = evaluate('btc', txns, 12000);
    expect(evald.unrealizedPnl).toBeCloseTo(2000);
  });
});
