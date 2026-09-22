import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 solo se usa en local; en Vercel va Turso (@libsql/client)
  serverExternalPackages: ["better-sqlite3", "@libsql/client"],
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
};

export default nextConfig;
