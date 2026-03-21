"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function McqSubjectAccuracyChart({
  data,
}: {
  data: { subject: string; accuracy: number }[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis domain={[0, 100]} stroke="var(--muted)" type="number" />
          <YAxis dataKey="subject" stroke="var(--muted)" type="category" width={110} />
          <Tooltip />
          <Bar dataKey="accuracy" fill="rgba(120, 164, 220, 0.72)" radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
