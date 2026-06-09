import type { NextConfig } from "next";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["localhost:3000"];

const nextConfig: NextConfig = {
  output: "standalone",
  // Garante que o file-tracing aponte para este projeto e não para
  // um package-lock.json pai detectado automaticamente.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
