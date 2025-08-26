"use client";
import React from 'react';
// NOTE: using relative path because TS path alias may not pick nested ui folder yet
import { formatUsd, formatQty } from '../lib/ui/format';

export type TokenHeaderProps = {
  assetId: string;
  symbol: string | null;
  lastPriceUsd: number | null;
  aggregates: {
    quantity: string;
    costBasisUsd: string;
    avgCostUsd: string | null;
    currentValueUsd: string | null;
    unrealizedPnlUsd: string | null;
    realizedPnlUsd: string | null;
  };
};

export default function TokenHeader(props: TokenHeaderProps) {
  const { assetId, symbol, lastPriceUsd, aggregates } = props;
  const displaySymbol = symbol || assetId.toUpperCase();
  const priceUnknown = lastPriceUsd == null;

  const metrics = [
    { label: 'Quantité', value: formatQty(aggregates.quantity) },
    { label: 'Coût total', value: formatUsd(aggregates.costBasisUsd) },
    { label: 'Coût moyen', value: aggregates.avgCostUsd ? formatUsd(aggregates.avgCostUsd) : '—' },
    { label: 'Valeur actuelle', value: priceUnknown ? '—' : formatUsd(aggregates.currentValueUsd) },
    { label: 'PnL latent', value: priceUnknown ? '—' : formatUsd(aggregates.unrealizedPnlUsd) },
    { label: 'PnL réalisé', value: formatUsd(aggregates.realizedPnlUsd) },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/50 rounded-2xl p-4 md:p-6 shadow flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl font-semibold">
          {displaySymbol.slice(0,4).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <div className="text-lg font-semibold flex items-center gap-2">
            {displaySymbol}
            {priceUnknown && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">INCONNU</span>}
          </div>
          <div className="text-sm text-slate-400">Prix live: {priceUnknown ? '—' : formatUsd(lastPriceUsd)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl bg-slate-800/60 px-3 py-2 flex flex-col gap-1 border border-slate-700/50">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">{m.label}</span>
            <span className="text-sm font-medium tabular-nums">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
