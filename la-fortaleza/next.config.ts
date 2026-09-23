import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql: archivo local en desarrollo, Turso en Vercel
  serverExternalPackages: ["@libsql/client", "nodemailer"],
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
};

export default nextConfig;
