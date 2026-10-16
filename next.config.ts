import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
