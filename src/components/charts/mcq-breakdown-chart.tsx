"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { gridStroke, tooltipContentStyle, tooltipCursorStyle, tooltipItemStyle, tooltipLabelStyle } from "./chart-theme";

const BAR_COLORS: Record<string, string> = {
  Right: "rgba(142, 217, 165, 0.72)",
  "Guessed Right": "rgba(243, 209, 123, 0.72)",
  Wrong: "rgba(227, 140, 140, 0.72)",
};

export function McqBreakdownChart({
  data,
}: {
  data: { label: "Right" | "Guessed Right" | "Wrong"; value: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis stroke="var(--muted)" />
          <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursorStyle} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={BAR_COLORS[entry.label]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
