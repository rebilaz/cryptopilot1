"use client";

import DemoBanner from "@/components/DemoBanner";
import ThemeToggle from "@/components/ThemeToggle";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import ScoreCard from "@/components/ScoreCard";

const pieData = [
  { name: "BTC", value: 50 },
  { name: "ETH", value: 30 },
  { name: "USDT", value: 20 },
];
const COLORS = ["#f7931a", "#627eea", "#26a17b"];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0f1524] text-white">
      {/* Bannière démo */}
      <DemoBanner />

      <div className="p-6 mx-auto max-w-6xl space-y-8">
        {/* Toggle thème */}
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        {/* Cartes horizontales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <div className="text-sm text-white/70">NAV</div>
            <div className="mt-1 text-2xl font-semibold">--</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <div className="text-sm text-white/70">Perf 7j</div>
            <div className="mt-1 text-2xl font-semibold">--</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <div className="text-sm text-white/70">Risque</div>
            <div className="mt-1 text-2xl font-semibold">--</div>
          </div>
        </div>

        {/* Graphique camembert */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-4">Allocation</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table statique */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="text-white/60 text-sm">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Poids</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Variation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr>
                <td className="px-4 py-3">BTC</td>
                <td className="px-4 py-3">50%</td>
                <td className="px-4 py-3">65,000</td>
                <td className="px-4 py-3 text-green-400">+2.1%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">ETH</td>
                <td className="px-4 py-3">30%</td>
                <td className="px-4 py-3">3,200</td>
                <td className="px-4 py-3 text-green-400">+1.5%</td>
              </tr>
              <tr>
                <td className="px-4 py-3">USDT</td>
                <td className="px-4 py-3">20%</td>
                <td className="px-4 py-3">1</td>
                <td className="px-4 py-3 text-white/70">0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Score Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col items-start gap-3 transition-transform duration-200 hover:scale-105 hover:shadow-md">
          <div className="text-base font-semibold mb-1">Score global</div>
          <div className="text-3xl font-bold mb-2">
            72
            <span className="text-lg font-normal text-white/60">/100</span>
          </div>
          <span className="inline-block rounded-full bg-amber-400/10 text-amber-200 px-3 py-1 text-xs font-medium">
            Risque modéré
          </span>
        </div>
      </div>
    </main>
  );
}
