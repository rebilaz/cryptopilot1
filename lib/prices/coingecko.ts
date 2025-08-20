const BASE_URL = "https://api.coingecko.com/api/v3";

function headers() {
  const key = process.env.CG_KEY;
  if (!key) console.warn("CG_KEY is not set");
  return key ? { "x-cg-demo-api-key": key } : {};
}

export async function fetchMarkets(
  vs = "usd",
  page = 1,
  perPage = 50
) {
  const res = await fetch(
    `${BASE_URL}/coins/markets?` +
      new URLSearchParams({
        vs_currency: vs,
        order: "market_cap_desc",
        per_page: String(perPage),
        page: String(page),
        sparkline: "true",
        price_change_percentage: "24h,7d",
      }),
    { next: { revalidate: 120 }, headers: headers() }
  );
  return res.json();
}

export async function fetchSimplePrices(ids: string[], vs = "usd") {
  const res = await fetch(
    `${BASE_URL}/simple/price?` +
      new URLSearchParams({ ids: ids.join(","), vs_currencies: vs }),
    { cache: "no-store", headers: headers() }
  );
  return (await res.json()) as Record<string, Record<string, number>>;
}

export async function fetchMarketChart(
  id: string,
  vs: string,
  days: number
) {
  const res = await fetch(
    `${BASE_URL}/coins/${id}/market_chart?` +
      new URLSearchParams({ vs_currency: vs, days: String(days) }),
    { cache: "no-store", headers: headers() }
  );
  const data = await res.json();
  return data.prices as [number, number][]; // [timestamp, price]
}
