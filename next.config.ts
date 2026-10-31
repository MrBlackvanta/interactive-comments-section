import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactCompiler: true,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
