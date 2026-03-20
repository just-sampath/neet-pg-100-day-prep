"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function McqTrendChart({
  data,
}: {
  data: { label: string; attempted: number; accuracy: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis yAxisId="left" stroke="var(--muted)" />
          <YAxis yAxisId="right" orientation="right" stroke="var(--muted)" />
          <Tooltip />
          <Line yAxisId="left" type="monotone" dataKey="attempted" stroke="var(--accent)" strokeWidth={3} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#8ed9a5" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
