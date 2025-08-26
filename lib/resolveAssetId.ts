import { getById, getBySymbol, norm } from './bqTokens';

export async function resolveAssetId(input: { assetId?: string; symbol?: string }): Promise<string | null> {
  const byId = input.assetId ? await getById(input.assetId) : null;
  if (byId?.id) return norm(byId.id);
  if (input.symbol) {
    const bySym = await getBySymbol(input.symbol);
    if (bySym?.id) return norm(bySym.id);
  }
  return null; // ignore unknown ids
}
