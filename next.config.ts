import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  serverExternalPackages: ['@whiskeysockets/baileys', 'pino'],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
