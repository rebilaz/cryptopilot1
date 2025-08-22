"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "BTC", value: 50 },
  { name: "ETH", value: 30 },
  { name: "USDT", value: 20 },
];

const COLORS = ["#f7931a", "#627eea", "#26a17b"];

export default function PortfolioPie() {
  return (
    <div className="bg-white/5 rounded-2xl p-5 h-64 flex flex-col">
      <div className="text-base font-semibold mb-3">Répartition</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              innerRadius="55%"
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, idx) => (
                <Cell key={entry.name} fill={COLORS[idx]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
