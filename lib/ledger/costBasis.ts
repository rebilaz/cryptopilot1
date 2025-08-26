// Weighted Average Cost (WAC) cost basis & PnL utilities
// Assumes chronological input (oldest -> newest). If not sorted, caller must sort by createdAt.
// Transaction signs:
// BUY, DEPOSIT increase position; SELL, WITHDRAW decrease; FEE decreases without proceeds.
// quantity is always positive in stored Transaction rows; direction depends on type.

export type Txn = {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'FEE' | 'ADJUST';
  quantity: number; // positive absolute quantity
  price?: number | null; // unit price (USD) when relevant
  createdAt: Date;
};

export interface CostBasisState {
  assetId: string;
  totalQuantity: number; // current holdings after processing
  avgCost: number; // weighted average unit cost of remaining holdings
  realizedPnl: number; // cumulative realized PnL
  fees: number; // cumulative fees (treated as cost increase)
}

export interface ProcessResult extends CostBasisState {
  unrealizedPnl?: number; // needs a current price to compute (computed externally)
}

export function processTransactions(assetId: string, txns: Txn[]): CostBasisState {
  let totalQty = 0;
  let avgCost = 0; // unit cost
  let realized = 0;
  let fees = 0;

  for (const t of txns) {
    if (t.assetId !== assetId) continue;
    const q = t.quantity;
    if (!(q > 0)) continue;
    switch (t.type) {
      case 'BUY':
      case 'DEPOSIT': {
        // Increase position; if no price provided (e.g. DEPOSIT of self-custodied), we don't change avgCost if price missing
        if (t.price && t.price > 0) {
          const positionCost = avgCost * totalQty;
            const addCost = t.price * q;
            const newQty = totalQty + q;
            avgCost = newQty > 0 ? (positionCost + addCost) / newQty : 0;
        }
        totalQty += q;
        break;
      }
      case 'SELL':
      case 'WITHDRAW': {
        // Decrease position; realized PnL when price provided & we have quantity
        const sellQty = Math.min(q, totalQty);
        if (sellQty > 0 && t.price && t.price > 0) {
          realized += (t.price - avgCost) * sellQty;
        }
        totalQty -= sellQty;
        if (totalQty < 0) totalQty = 0;
        // avgCost unchanged under WAC after partial sale
        break;
      }
      case 'FEE': {
        // Fee reduces quantity (if fee charged in the same asset) and increases cost basis per unit
        const feeQty = Math.min(q, totalQty);
        fees += feeQty * (t.price || avgCost); // accumulate fee in USD (approx if no price)
        totalQty -= feeQty;
        if (totalQty < 0) totalQty = 0;
        break;
      }
      case 'ADJUST': {
        // Directly set quantity (inventory adjustment) without PnL; treat as neutral unless price provided -> re-anchor avgCost
        const newQty = q; // interpret quantity as new absolute quantity
        if (newQty >= 0) {
          if (newQty > 0 && t.price && t.price > 0) {
            avgCost = t.price;
          }
          totalQty = newQty;
        }
        break;
      }
      default:
        break;
    }
  }

  return { assetId, totalQuantity: totalQty, avgCost, realizedPnl: realized, fees };
}

export function computeUnrealized(state: CostBasisState, currentPrice?: number | null): ProcessResult {
  if (!currentPrice || !(currentPrice > 0)) return { ...state };
  const marketValue = state.totalQuantity * currentPrice;
  const costValue = state.totalQuantity * state.avgCost;
  const unrealizedPnl = marketValue - costValue;
  return { ...state, unrealizedPnl };
}

// Convenience helper to go end-to-end
export function evaluate(assetId: string, txns: Txn[], currentPrice?: number | null): ProcessResult {
  const s = processTransactions(assetId, txns);
  return computeUnrealized(s, currentPrice);
}
