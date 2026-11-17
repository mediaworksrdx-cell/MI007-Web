import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
