export type TxType = 'BUY'|'SELL'|'DEPOSIT'|'WITHDRAW'|'AIRDROP'|'FEE'|'ADJUST';

export interface TransactionItemDTO {
  id: string;
  type: TxType;
  quantity: string;
  unitPriceUsd?: string;
  feeUsd?: string;
  txTime: string; // ISO
  note?: string;
  txHash?: string;
}

export interface TransactionsPageDTO {
  items: TransactionItemDTO[];
  nextCursor?: string | null;
  prevCursor?: string | null;
  totalCount?: number;
}

export interface AssetAggregatesDTO {
  quantity: string;
  costBasisUsd: string;
  avgCostUsd: string | null;
  currentValueUsd: string | null;
  unrealizedPnlUsd: string | null;
  realizedPnlUsd: string | null;
}

export interface AssetHistorySSRDTO {
  assetId: string;
  symbol: string | null;
  lastPriceUsd: number | null;
  aggregates: AssetAggregatesDTO;
  page: TransactionsPageDTO;
}
