import type { NextConfig } from "next";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["localhost:3000"];

const nextConfig: NextConfig = {
  // Sem "output: standalone": o app roda em pasta única via `next start`,
  // que carrega o .env.local nativamente em runtime (ver deploy/deploy-develop.sh).
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
