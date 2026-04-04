import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";

import { getCurrentUser } from "@/lib/auth/session";
import { readStore } from "@/lib/data/local-store";
import { APP_NAME } from "@/lib/domain/constants";
import { APP_DESCRIPTION, PWA_THEME_COLOR } from "@/lib/domain/app-meta";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
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
    if (getRuntimeMode() === "supabase") {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const { data } = await supabase
          .from("app_settings")
          .select("theme")
          .eq("user_id", user.id)
          .maybeSingle();
        theme = data?.theme === "light" ? "light" : "dark";
      }
    } else {
      const store = await readStore();
      theme = store.userState[user.id]?.settings.theme ?? "dark";
    }
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
