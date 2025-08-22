import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";

// Support multiple naming variants to avoid confusion
function resolveKey(): string | undefined {
  return (
    process.env.COINGECKO_API_KEY ||
    process.env.CG_KEY ||
    process.env.NEXT_PUBLIC_COINGECKO_API_KEY // (éviter usage côté client – juste fallback)
  );
}

function headers() {
  const key = resolveKey();
  if (!key) return {};
  // Coingecko accepte différents headers selon plan; on tente pro puis demo
  return { "x-cg-pro-api-key": key, "x-cg-demo-api-key": key };
}

export async function fetchMarkets(
  vs = "usd",
  page = 1,
  perPage = 50
) {
  const { data } = await axios.get(`${BASE_URL}/coins/markets`, {
    params: {
      vs_currency: vs,
      order: "market_cap_desc",
      per_page: perPage,
      page,
      sparkline: true,
      price_change_percentage: "24h,7d",
    },
    headers: headers(),
  });
  return data;
}

export async function fetchSimplePrices(ids: string[], vs = "usd") {
  if (!ids.length) return {} as Record<string, Record<string, number>>;
  // Endpoint limite ~250 ids; on segmente si nécessaire
  const chunkSize = 200;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));
  const out: Record<string, Record<string, number>> = {};
  for (const c of chunks) {
    const { data } = await axios.get(`${BASE_URL}/simple/price`, {
      params: { ids: c.join(","), vs_currencies: vs },
      headers: headers(),
    });
    Object.assign(out, data);
  }
  return out as Record<string, Record<string, number>>;
}

export async function fetchMarketChart(
  id: string,
  vs: string,
  days: number
) {
  const { data } = await axios.get(`${BASE_URL}/coins/${id}/market_chart`, {
    params: { vs_currency: vs, days },
    headers: headers(),
  });
  return data.prices as [number, number][]; // [timestamp, price]
}
