import React from 'react';
import TokenHeader from '../../../components/TokenHeader';
import TransactionsTable from '../../../components/TransactionsTable';
import AddTransactionForm from '../../../components/AddTransactionForm';
import { notFound } from 'next/navigation';

// Server fetch helper (SSR initial)
async function fetchInitial(assetId: string) {
  try {
    const url = `${process.env.NEXTAUTH_URL || ''}/api/portfolio/${assetId}/transactions`; // TODO: adapt base URL if needed
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

export default async function AssetPage({ params }: { params: { assetId: string } }) {
  const assetId = params.assetId;
  if (!assetId) return notFound();
  const initial = await fetchInitial(assetId);
  if (!initial) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-500">Erreur chargement des données.</div>
      </div>
    );
  }

  const { symbol, lastPriceUsd, aggregates, page } = initial;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <TokenHeader assetId={assetId} symbol={symbol} lastPriceUsd={lastPriceUsd} aggregates={aggregates} />
      <AddTransactionForm assetId={assetId} defaultSymbol={symbol} />
      <TransactionsTable assetId={assetId} initialPage={page} />
    </div>
  );
}
