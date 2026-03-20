import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";

import { getCurrentUser } from "@/lib/auth/session";
import { readStore } from "@/lib/data/local-store";
import { APP_NAME } from "@/lib/domain/constants";

import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "A quiet NEET PG 2026 study companion for schedule tracking, backlog recovery, and exam prep analytics.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  let theme = "dark";
  if (user) {
    const store = await readStore();
    theme = store.userState[user.id]?.settings.theme ?? "dark";
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
