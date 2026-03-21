"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function McqTrendChart({
  data,
}: {
  data: { label: string; attempted: number; accuracy: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis yAxisId="left" stroke="var(--muted)" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--muted)" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="attempted" fill="rgba(223, 176, 111, 0.68)" radius={[10, 10, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#8ed9a5" strokeWidth={3} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
