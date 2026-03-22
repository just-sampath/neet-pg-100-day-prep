import type { CSSProperties } from "react";

/** Tooltip container: matches the app's panel aesthetic. */
export const tooltipContentStyle: CSSProperties = {
  backgroundColor: "var(--surface-strong)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "0.6rem 0.8rem",
  boxShadow: "var(--shadow-soft)",
  color: "var(--foreground)",
};

/** Tooltip data rows. */
export const tooltipItemStyle: CSSProperties = {
  color: "var(--text-secondary)",
  padding: "2px 0",
  fontSize: "0.85rem",
};

/** Tooltip header label. */
export const tooltipLabelStyle: CSSProperties = {
  color: "var(--foreground)",
  fontWeight: 600,
  marginBottom: "0.25rem",
};

/** Legend text. */
export const legendStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: "0.82rem",
};

/** CartesianGrid stroke — adapts per theme via CSS variable. */
export const gridStroke = "var(--border)";

/** Tooltip hover-cursor line. */
export const tooltipCursorStyle = { stroke: "var(--border-strong)" };
