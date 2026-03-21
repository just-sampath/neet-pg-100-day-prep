import packageInfo from "../../../package.json";

export const APP_VERSION = packageInfo.version;
export const APP_DESCRIPTION =
  "A quiet NEET PG 2026 study companion for schedule tracking, backlog recovery, and exam prep analytics.";
export const PWA_BACKGROUND_COLOR = "#0a0a0f";
export const PWA_THEME_COLOR = "#0f172a";

export const STUDY_DOCUMENT_LINKS = [
  {
    href: "/api/docs/schedule-workbook",
    label: "Schedule workbook",
    description: "The source 100-day Excel schedule used to generate the app data.",
  },
  {
    href: "/api/docs/product-spec",
    label: "Product spec",
    description: "The PRD that defines the intended quiet study-companion behavior.",
  },
  {
    href: "/api/docs/technical-architecture",
    label: "Technical architecture",
    description: "The system blueprint for persistence, sync, and product flows.",
  },
] as const;
