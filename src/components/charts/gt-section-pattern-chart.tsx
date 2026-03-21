"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GtSectionPatternChart({
  data,
}: {
  data: { section: string; notEnoughTime: number; panic: number; guessedTooMuch: number }[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="section" stroke="var(--muted)" />
          <YAxis stroke="var(--muted)" />
          <Tooltip />
          <Legend />
          <Bar dataKey="notEnoughTime" name="Time not enough" fill="rgba(223, 176, 111, 0.72)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="panic" name="Panic started" fill="rgba(227, 140, 140, 0.72)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="guessedTooMuch" name="Guessed too much" fill="rgba(120, 164, 220, 0.72)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
