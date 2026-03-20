import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
