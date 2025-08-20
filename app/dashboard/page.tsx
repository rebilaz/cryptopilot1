"use client";
import { useEffect, useState } from "react";
import ScoreCard from "@/components/ScoreCard";
import PortfolioChart from "@/components/PortfolioChart";
import ThemeToggle from "@/components/ThemeToggle";

type AnalyzeResponse = {
  summary: { nav: number; risk: string; score: number };
  chart: { timestamps: number[]; navSeries: number[] };
};

export default function DashboardPage() {
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: [
            { asset: "BTC", amount: 0.1 },
            { asset: "ETH", amount: 1 },
            { asset: "USDT", amount: 1000 },
          ],
          vsCurrency: "usd",
          window: "7d",
        }),
      });
      if (res.ok) setData(await res.json());
    };
    load();
  }, []);

  const chartData = data
    ? data.chart.timestamps.map((t, i) => ({ timestamp: t, nav: data.chart.navSeries[i] }))
    : [];

  return (
    <main className="p-6 space-y-4">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      {data ? (
        <>
          <ScoreCard summary={data.summary} />
          {chartData.length > 0 && (
            <PortfolioChart data={chartData} />
          )}
        </>
      ) : (
        <p>Chargement...</p>
      )}
    </main>
  );
}
