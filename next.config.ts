import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config, { dev }) => {
    if (dev && config.watchOptions) {
      // Exclude .data/ from file watching to prevent the write-watch-rerender
      // feedback loop in local mode. Store writes to .data/local-store.json
      // were triggering Turbopack rebuilds, which triggered new reads, which
      // raced with in-flight writes and caused JSON corruption on Windows.
      const existing = config.watchOptions.ignored;
      if (Array.isArray(existing)) {
        config.watchOptions.ignored = [...existing, "**/.data/**"];
      } else if (existing) {
        config.watchOptions.ignored = [existing, "**/.data/**"];
      } else {
        config.watchOptions.ignored = ["**/.data/**"];
      }
    }
    return config;
  },
};

export default nextConfig;
