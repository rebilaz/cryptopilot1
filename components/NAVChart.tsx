"use client";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { day: "J1", nav: 100 },
  { day: "J2", nav: 102 },
  { day: "J3", nav: 101 },
  { day: "J4", nav: 105 },
  { day: "J5", nav: 107 },
  { day: "J6", nav: 106 },
  { day: "J7", nav: 108 },
];

export default function NAVChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-64 flex flex-col">
      <div className="text-base font-semibold mb-3">NAV (7 jours)</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} stroke="#fff" />
            {/* Axe Y caché */}
            <Line
              type="monotone"
              dataKey="nav"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={{ background: "#222", border: "none", color: "#fff" }}
              labelStyle={{ color: "#fff" }}
              formatter={(value: number) => value}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
