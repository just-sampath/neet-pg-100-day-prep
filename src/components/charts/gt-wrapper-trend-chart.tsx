"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { gridStroke, legendStyle, tooltipContentStyle, tooltipCursorStyle, tooltipItemStyle, tooltipLabelStyle } from "./chart-theme";

export function GtWrapperTrendChart({
  data,
}: {
  data: { label: string; knowledge: number | null; behaviour: number | null; unsureRight: number | null }[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis yAxisId="left" domain={[0, 100]} stroke="var(--muted)" />
          <YAxis yAxisId="right" orientation="right" stroke="var(--muted)" />
          <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursorStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line yAxisId="left" type="monotone" dataKey="knowledge" name="Knowledge %" stroke="#8ed9a5" strokeWidth={3} />
          <Line yAxisId="left" type="monotone" dataKey="behaviour" name="Behaviour %" stroke="#dfb06f" strokeWidth={3} />
          <Line yAxisId="right" type="monotone" dataKey="unsureRight" name="Unsure-right" stroke="#78a4dc" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
