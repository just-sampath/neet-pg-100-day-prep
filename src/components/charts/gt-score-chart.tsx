"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { gridStroke, legendStyle, tooltipContentStyle, tooltipCursorStyle, tooltipItemStyle, tooltipLabelStyle } from "./chart-theme";

export function GtScoreChart({
  data,
}: {
  data: { label: string; score: number; accuracy: number | null }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis yAxisId="left" stroke="var(--muted)" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--muted)" />
          <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursorStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line yAxisId="left" type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#8ed9a5" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
