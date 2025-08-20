import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";

function headers() {
  const key = process.env.CG_KEY;
  if (!key) {
    console.warn("CG_KEY environment variable is not set.");
  }
  return key ? { "x-cg-demo-api-key": key } : {};
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
  const { data } = await axios.get(`${BASE_URL}/simple/price`, {
    params: {
      ids: ids.join(","),
      vs_currencies: vs,
    },
    headers: headers(),
  });
  return data as Record<string, Record<string, number>>;
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
