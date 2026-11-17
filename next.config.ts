import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
