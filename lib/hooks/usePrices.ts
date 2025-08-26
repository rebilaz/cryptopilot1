"use client";
import useSWR from 'swr';

interface PricesResponse { ok: boolean; prices: Record<string, Record<string, number>>; unknown?: any[]; partial?: boolean }

const fetcher = async (key: string, body: any) => {
  const res = await fetch('/api/prices', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok || json.ok === false) throw new Error(json.error || 'prices_failed');
  return json as PricesResponse;
};

export function usePrices(inputs: Array<{ assetId?: string; symbol?: string }>, vs: string = 'usd') {
  const normInputs = (inputs||[]).map(o => ({ assetId: o.assetId?.toLowerCase?.(), symbol: o.symbol?.toUpperCase?.() })).filter(o => o.assetId || o.symbol);
  const key = ['/api/prices', JSON.stringify(normInputs), vs];
  const { data, error, isLoading, mutate } = useSWR(key, () => fetcher('prices', { inputs: normInputs, vs }), {
    refreshInterval: 300_000,
    dedupingInterval: 15_000,
    revalidateOnFocus: false,
    keepPreviousData: true
  });
  return { prices: data?.prices || {}, unknown: data?.unknown || [], partial: data?.partial || false, isLoading, error, mutate };
}
