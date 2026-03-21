"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GtScoreChart({
  data,
}: {
  data: { label: string; score: number; accuracy: number | null }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis yAxisId="left" stroke="var(--muted)" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--muted)" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#8ed9a5" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
