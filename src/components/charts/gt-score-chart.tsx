"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GtScoreChart({
  data,
}: {
  data: { label: string; score: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis stroke="var(--muted)" />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
