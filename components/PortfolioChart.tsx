"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { timestamp: number; nav: number }[];
}

export default function PortfolioChart({ data }: Props) {
  const formatted = data.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString(),
    nav: d.nav,
  }));
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ left: 12, right: 12, top: 10, bottom: 10 }}>
          <XAxis dataKey="date" hide={formatted.length > 30} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip formatter={(v: any) => v.toFixed(2)} labelFormatter={(l) => l} />
          <Line type="monotone" dataKey="nav" stroke="#6366f1" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
